import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstNumber?: string;
    orgId: string;
  }) {
    try {
      return await this.prisma.supplier.create({ data });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A supplier with this name already exists in this organization',
        );
      }
      throw error;
    }
  }

  async findAll(params: {
    orgId: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    const { orgId, search, limit = 20, page = 1 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      orgId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      data: suppliers,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, orgId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, orgId },
      include: {
        // 🔥 Include the 10 most recent purchases
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
      },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }
  async getPurchasesBySupplier(
    id: string,
    orgId: string,
    params: { limit?: number; page?: number },
  ) {
    const { limit = 20, page = 1 } = params;
    const skip = (page - 1) * limit;

    // 1. Verify supplier exists in this org
    await this.findOne(id, orgId);

    // 2. Fetch paginated purchases
    const [total, purchases] = await Promise.all([
      this.prisma.purchase.count({
        where: { supplierId: id, orgId },
      }),
      this.prisma.purchase.findMany({
        where: { supplierId: id, orgId },
        orderBy: { createdAt: 'desc' }, // Newest first
        skip,
        take: limit,
        include: {
          // Include details about what was purchased
          items: {
            include: {
              product: { select: { name: true, barcode: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: purchases,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }
  async update(id: string, orgId: string, data: Prisma.SupplierUpdateInput) {
    const result = await this.prisma.supplier.updateMany({
      where: { id, orgId },
      data,
    });

    if (result.count === 0) throw new NotFoundException('Supplier not found');

    return this.findOne(id, orgId);
  }

  async delete(id: string, orgId: string) {
    const result = await this.prisma.supplier.deleteMany({
      where: { id, orgId },
    });

    if (result.count === 0) throw new NotFoundException('Supplier not found');

    return { message: 'Supplier deleted successfully' };
  }
}
