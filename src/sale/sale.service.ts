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
      // 1. Validate Products & Check Stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, orgId },
          select: { stockQty: true, name: true },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found.`);
        }

        // if (product.stockQty < item.quantity) {
        //   throw new BadRequestException(
        //     `Insufficient stock for ${product.name}. Available: ${product.stockQty}, Requested: ${item.quantity}`,
        //   );
        // }

        // 2. Deduct Stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Atomic Bill Number Generation
      const lastSale = await tx.sale.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: { billNumber: true },
      });

      const nextBillNumber = lastSale
        ? (parseInt(lastSale.billNumber) + 1).toString()
        : '1001';

      // 4. Create Sale and Line Items
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
