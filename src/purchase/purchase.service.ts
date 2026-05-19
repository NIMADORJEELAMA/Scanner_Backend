import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentMode, PurchaseStatus } from '@prisma/client';

export class CreatePurchaseDto {
  supplierId: string;
  invoiceNo?: string;
  paymentMode?: PaymentMode;
  discount?: number;
  amountPaid?: number;
  items: {
    productId: string;
    quantity: number;
    costPrice: number;
    taxRate?: number;
  }[];
}
@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, data: CreatePurchaseDto) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Purchase must contain at least one item.');
    }

    // 1. Calculate totals securely on the backend
    let totalAmount = 0;
    let taxAmount = 0;

    data.items.forEach((item) => {
      const lineTotal = item.quantity * item.costPrice;
      totalAmount += lineTotal;
      if (item.taxRate) {
        taxAmount += lineTotal * (item.taxRate / 100);
      }
    });

    const discount = data.discount || 0;
    const finalAmount = totalAmount + taxAmount - discount;
    const amountPaid = data.amountPaid || 0;
    const amountDue = finalAmount - amountPaid;

    // 2. Execute a Prisma Transaction
    return await this.prisma.$transaction(async (tx) => {
      // Step A: Create the Purchase and PurchaseItems
      const purchase = await tx.purchase.create({
        data: {
          orgId,
          userId,
          supplierId: data.supplierId,
          invoiceNo: data.invoiceNo,
          totalAmount,
          taxAmount,
          discount,
          finalAmount,
          amountPaid,
          amountDue,
          paymentMode: data.paymentMode,
          status: PurchaseStatus.COMPLETED,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              costPrice: item.costPrice,
              taxRate: item.taxRate || 0,
            })),
          },
        },
        include: {
          items: true,
          supplier: true,
        },
      });

      // Step B: Update Product Stock & Latest Cost Price
      for (const item of data.items) {
        // First verify the product belongs to this organization
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.orgId !== orgId) {
          throw new NotFoundException(
            `Product ${item.productId} not found in this organization.`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: {
              increment: item.quantity, // 🔥 Add to existing stock
            },
            costPrice: item.costPrice, // 🔥 Update to the latest purchase price
            supplierId: data.supplierId, // Link product to this supplier
          },
        });
      }

      return purchase;
    });
  }

  async findAll(params: { orgId: string; limit?: number; page?: number }) {
    const { orgId, limit = 20, page = 1 } = params;
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      this.prisma.purchase.count({ where: { orgId } }),
      this.prisma.purchase.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          supplier: { select: { name: true, contactName: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    return {
      data: purchases,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, orgId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, orgId },
      include: {
        supplier: true,
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, barcode: true, unit: true } },
          },
        },
      },
    });

    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }
}
