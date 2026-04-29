import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSaleDto, userId: string, orgId: string) {
    const {
      items,
      paymentMode,
      amountCash,
      amountOnline,
      amountCard,
      totalAmount,
      discount,
      taxAmount,
      gstPercentage,
      finalAmount,
    } = dto;

    // FIX FOR TS18048: Early exit if items is undefined
    if (!items || items.length === 0) {
      throw new BadRequestException('Sale must include at least one item.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate Products & Deduct Stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, orgId },
          select: { stockQty: true, name: true },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found.`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });
      }

      // 2. Atomic Bill Number Generation
      const lastSale = await tx.sale.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: { billNumber: true },
      });

      const nextBillNumber = lastSale
        ? (parseInt(lastSale.billNumber) + 1).toString()
        : '1001';

      // ... inside the transaction
      return await tx.sale.create({
        data: {
          orgId,
          userId,
          billNumber: nextBillNumber,
          paymentMode: paymentMode || 'CASH',
          amountCash: amountCash || 0,
          amountOnline: amountOnline || 0,
          amountCard: amountCard || 0,
          totalAmount: totalAmount || 0,
          taxAmount: taxAmount || 0,
          discount: discount || 0,
          gstPercentage: gstPercentage || 0,
          finalAmount: finalAmount || 0,
          items: {
            create: items.map((item) => ({
              // We use the "Unchecked" pattern here by passing the ID directly
              productId: item.productId as string,
              quantity: item.quantity as number,
              price: item.price as unknown as any, // Decimal handling
              lineDiscount: item.lineDiscount || 0,
              taxRate: item.taxRate || 0,
            })),
          },
        },
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });
    });
  }

  async findAll(
    orgId: string,
    query: { search?: string; startDate?: string; endDate?: string },
  ) {
    const { search, startDate, endDate } = query;

    return this.prisma.sale.findMany({
      where: {
        orgId,
        ...(search && {
          OR: [
            { billNumber: { contains: search } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
        ...((startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && {
              lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            }),
          },
        }),
      },
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async getSalesReport(orgId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    // 1. Overall Totals
    const totals = await this.prisma.sale.aggregate({
      where: { orgId, createdAt: { gte: start, lte: end } },
      _sum: {
        finalAmount: true,
        totalAmount: true,
        taxAmount: true,
        discount: true,
      },
      _count: { id: true },
    });

    // 2. Revenue by Payment Mode (For Donut/Pie Chart)
    const paymentBreakdown = await this.prisma.sale.groupBy({
      by: ['paymentMode'],
      where: { orgId, createdAt: { gte: start, lte: end } },
      _sum: { finalAmount: true },
    });

    // 3. Top 5 Products (For Bar Chart)
    const topProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { orgId, createdAt: { gte: start, lte: end } },
      },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // Enrich top products with names
    const topProductsWithNames = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return { ...item, name: product?.name };
      }),
    );

    return {
      summary: {
        totalRevenue: totals._sum.finalAmount || 0,
        totalSalesCount: totals._count.id || 0,
        averageOrderValue: totals._count.id
          ? Number(totals._sum.finalAmount || 0) / totals._count.id
          : 0,
      },
      paymentBreakdown,
      topProducts: topProductsWithNames,
    };
  }
  async getSalesTimeline(orgId: string, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    // Fetch all sales for the day
    const sales = await this.prisma.sale.findMany({
      where: {
        orgId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        finalAmount: true,
      },
    });

    // Initialize 24-hour slots (0-23)
    const timeline = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      orderCount: 0,
      revenue: 0,
    }));

    // Populate slots
    sales.forEach((sale) => {
      const hour = new Date(sale.createdAt).getHours();
      timeline[hour].orderCount += 1;
      timeline[hour].revenue += Number(sale.finalAmount || 0);
    });

    // Find the peak hour
    const peakHourData = [...timeline].sort(
      (a, b) => b.orderCount - a.orderCount,
    )[0];

    return {
      date,
      timeline,
      peakHour: peakHourData.orderCount > 0 ? peakHourData : null,
    };
  }
}
