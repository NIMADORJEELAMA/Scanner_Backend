import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BulkProductDto } from './dto/bulk-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}
  private generateBarcode(): string {
    const prefix = '27'; // optional store prefix
    const random = Math.floor(1000000000 + Math.random() * 9000000000); // 10 digits
    return `${prefix}${random}`; // total ~12 digits
  }
  /**
   * Create Product - Scoped to Org
   */
  async create(data: any, orgId: string) {
    try {
      const barcode = data.barcode || this.generateBarcode();

      return await this.prisma.product.create({
        data: {
          ...data,
          barcode,
          orgId,
        },
        include: { category: true },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A product with this barcode already exists in your store.',
        );
      }
      throw error;
    }
  }
  /**
   * Scoped Search & Pagination
   */
  async findAll(
    orgId: string,
    params: {
      skip?: string | number;
      take?: string | number;
      search?: string;
      categoryId?: string;
      isActive?: boolean;
    },
  ) {
    // Ensure we are working with numbers
    const skip = Number(params.skip) || 0;
    const take = Number(params.take) || 20;
    const { search, categoryId, isActive } = params;

    const where: Prisma.ProductWhereInput = {
      orgId,
      isActive: isActive ?? true,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip, // Now safely a number
        take, // Now safely a number
        include: { category: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / take),
      items,
    };
  }
  /**
   * Find One - Scoped
   */
  async findOne(id: string, orgId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, orgId }, // Ensure product belongs to this org
      include: { category: true },
    });
    if (!product)
      throw new NotFoundException(`Product not found in your inventory`);
    return product;
  }

  /**
   * Barcode Lookup - Scoped via Composite Key
   */
  async findByBarcode(orgId: string, barcode: string) {
    if (!orgId) {
      throw new BadRequestException('Organization context is missing');
    }

    const product = await this.prisma.product.findUnique({
      where: {
        orgId_barcode: {
          orgId: orgId, // If this is undefined, Prisma crashes
          barcode: barcode,
        },
      },
    });

    if (!product)
      throw new NotFoundException('Product not found in this store');
    return product;
  }

  async update(id: string, orgId: string, data: Prisma.ProductUpdateInput) {
    try {
      // Using updateMany allows us to include orgId in the where clause
      // since update only accepts the unique ID.
      const product = await this.prisma.product.update({
        where: { id, orgId }, // If orgId doesn't match, this fails
        data,
      });
      return product;
    } catch (error) {
      throw new BadRequestException('Failed to update product. ');
    }
  }
  async deleteOrDeactivate(id: string, orgId: string) {
    // 1. Fetch product with count of related sale items
    const product = await this.prisma.product.findUnique({
      where: { id, orgId },
      include: {
        _count: {
          select: { saleItems: true }, // Using the exact relation name from your schema
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    try {
      // 2. Logic: If product has historical sales, de-activate (Soft Delete)
      if (product._count.saleItems > 0) {
        return await this.prisma.product.update({
          where: { id, orgId },
          data: { isActive: false },
        });
      }

      // 3. Otherwise, hard delete from database
      return await this.prisma.product.delete({
        where: { id, orgId },
      });
    } catch (error) {
      throw new BadRequestException(
        'Action failed. The product cannot be removed.',
      );
    }
  }

  async createBulk(dto: BulkProductDto, userId: string, orgId: string) {
    const { products } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Fix the first error: Ensure barcodes is strictly string[]
      // We use .filter((b): b is string => !!b) to satisfy the TS compiler
      const barcodes: string[] = products
        .map((p) => p.barcode)
        .filter((b): b is string => !!b);

      if (barcodes.length > 0) {
        const existingBarcode = await tx.product.findFirst({
          // Now 'barcodes' is guaranteed to be string[]
          where: { barcode: { in: barcodes }, orgId },
        });
        if (existingBarcode) {
          throw new BadRequestException(
            `Barcode ${existingBarcode.barcode} already exists.`,
          );
        }
      }

      // 2. Fix the second error: Handle undefined barcode in mapping
      return await tx.product.createMany({
        data: products.map((p) => ({
          name: p.name,
          price: p.price,
          costPrice: p.costPrice,
          stockQty: p.stockQty,
          unit: p.unit,
          categoryId: p.categoryId,
          orgId: orgId,
          // Convert undefined to null or an empty string to satisfy Prisma/TS
          barcode: p.barcode ?? '',
        })),
        skipDuplicates: false,
      });
    });
  }
}
