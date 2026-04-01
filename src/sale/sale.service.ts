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

  // sale.service.ts

  async create(dto: any, userId: string, orgId: string) {
    const { items, paymentMode, totalAmount, discount, finalAmount } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Extract all product IDs from the request
      const productIds = items.map((item: any) => item.productId);

      // 2. Check if all these products actually exist in the DB
      const existingProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
          orgId: orgId, // Safety check: ensure products belong to this org
        },
        select: { id: true },
      });

      if (existingProducts.length !== items.length) {
        throw new NotFoundException(
          'One or more products were not found in your inventory.',
        );
      }

      // 3. Logic for Bill Number
      const lastSale = await tx.sale.findFirst({
        where: { orgId },
        orderBy: { billNumber: 'desc' },
      });
      const nextBillNumber = lastSale ? lastSale.billNumber + 1 : 1001;

      // 4. Create the Sale
      return await tx.sale.create({
        data: {
          orgId,
          billNumber: nextBillNumber,
          userId,
          paymentMode,
          totalAmount,
          discount,
          finalAmount,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });
    });
  }

  // Get all sales for reporting
  async findAll() {
    return this.prisma.sale.findMany({
      include: {
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
