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
}
