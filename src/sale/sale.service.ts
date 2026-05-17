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

    // 1. Fetch Totals, Payments, Top Products, and All Products Sold in Parallel
    const [totals, paymentBreakdown, topProducts, rawAllItemsSold] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: { orgId, createdAt: { gte: start, lte: end } },
          _sum: { finalAmount: true },
          _count: { id: true },
        }),
        this.prisma.sale.groupBy({
          by: ['paymentMode'],
          where: { orgId, createdAt: { gte: start, lte: end } },
          _sum: { finalAmount: true },
        }),
        this.prisma.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { orgId, createdAt: { gte: start, lte: end } } },
          _sum: { quantity: true, price: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5, // Kept for your frontend "Top Selling Items" bar chart
        }),
        this.prisma.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { orgId, createdAt: { gte: start, lte: end } } },
          _sum: { quantity: true, price: true },
          orderBy: { _sum: { quantity: 'desc' } },
        }),
      ]);

    // 2. Collect unique product IDs across both lists to make one single query
    const distinctProductIds = Array.from(
      new Set([
        ...topProducts.map((p) => p.productId),
        ...rawAllItemsSold.map((p) => p.productId),
      ]),
    );

    // 3. Fetch all required Product details along with their nested Categories
    const productsWithCategories = await this.prisma.product.findMany({
      where: { id: { in: distinctProductIds } },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create lookups to easily reference names later
    const productLookup = new Map(productsWithCategories.map((p) => [p.id, p]));

    // 4. Format Top Products List
    const topProductsWithNames = topProducts.map((tp) => ({
      ...tp,
      name: productLookup.get(tp.productId)?.name || 'Unknown',
    }));

    // 5. Format Comprehensive List of All Items Sold
    const allItemsSold = rawAllItemsSold.map((item) => {
      const matchedProduct = productLookup.get(item.productId);
      return {
        productId: item.productId,
        name: matchedProduct?.name || 'Unknown',
        categoryName: matchedProduct?.category?.name || 'Uncategorized',
        categoryId: matchedProduct?.category?.id || null,
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenueGenerated: item._sum.price || 0,
      };
    });

    // 6. Dynamically Generate Category Sales Breakdown from items sold mapping
    const categoryBreakdownMap: {
      [key: string]: {
        categoryId: string | null;
        name: string;
        quantity: number;
        revenue: number;
      };
    } = {};

    allItemsSold.forEach((item) => {
      const catName = item.categoryName;
      if (!categoryBreakdownMap[catName]) {
        categoryBreakdownMap[catName] = {
          categoryId: item.categoryId,
          name: catName,
          quantity: 0,
          revenue: 0,
        };
      }
      categoryBreakdownMap[catName].quantity += item.totalQuantitySold;
      categoryBreakdownMap[catName].revenue += Number(
        item.totalRevenueGenerated,
      );
    });

    const categoryBreakdown = Object.values(categoryBreakdownMap);

    // 7. Composite Payload Delivery Object
    return {
      summary: {
        totalRevenue: totals._sum.finalAmount || 0,
        totalSalesCount: totals._count.id || 0,
        averageOrderValue: totals._count.id
          ? Number(totals._sum.finalAmount) / totals._count.id
          : 0,
      },
      paymentBreakdown,
      topProducts: topProductsWithNames, // Used for your 5-column BarChart component
      allItemsSold, // Full historical listing of items dropped
      categoryBreakdown, // High-level analytics metrics split by category groupings
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
