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

  async create(dto: any, userId: string, orgId: string) {
    // 1. Accept orgId here
    const { items, paymentMode, totalAmount, discount, finalAmount } = dto;

    return await this.prisma.$transaction(async (tx) => {
      const lastSale = await tx.sale.findFirst({
        where: { orgId }, // Scoped to the store
        orderBy: { billNumber: 'desc' },
      });
      const nextBillNumber = lastSale ? lastSale.billNumber + 1 : 1001;

      return await tx.sale.create({
        data: {
          orgId: orgId, // 2. THIS FIXES THE ERROR
          billNumber: nextBillNumber,
          userId: userId,
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
