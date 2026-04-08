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
      totalAmount,
      discount,
      taxAmount,
      gstPercentage,
      finalAmount,
    } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate Products Exist
      const productIds = items.map((i) => i.productId);
      const existingProductsCount = await tx.product.count({
        where: { id: { in: productIds }, orgId },
      });

      if (existingProductsCount !== items.length) {
        throw new NotFoundException('One or more products were not found.');
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

      // 3. Create Sale and Line Items
      return await tx.sale.create({
        data: {
          orgId,
          userId,
          billNumber: nextBillNumber,
          paymentMode,
          totalAmount,
          taxAmount,
          discount,
          gstPercentage,
          finalAmount,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
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
