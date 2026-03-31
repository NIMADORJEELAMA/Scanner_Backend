import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Product - Scoped to Org
   */
  async create(data: any, orgId: string) {
    try {
      return await this.prisma.product.create({
        data: {
          ...data,
          orgId, // Explicitly set the organization
        },
        include: { category: true },
      });
    } catch (error) {
      if (error.code === 'P2002') {
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
      skip?: number;
      take?: number;
      search?: string;
      categoryId?: string;
      isActive?: boolean;
    },
  ) {
    const { skip, take, search, categoryId, isActive } = params;

    const where: Prisma.ProductWhereInput = {
      orgId, // MANDATORY: Only show products for this store
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
        skip,
        take,
        include: { category: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / (take || 10)),
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
  /**
   * Update - Scoped
   */
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
      throw new BadRequestException(
        'Failed to update product. Access denied or not found.',
      );
    }
  }

  /**
   * Soft Delete - Scoped
   */
  async deactivate(id: string, orgId: string) {
    try {
      return await this.prisma.product.update({
        where: { id, orgId },
        data: { isActive: false },
      });
    } catch (error) {
      throw new BadRequestException('Failed to deactivate product.');
    }
  }
}
