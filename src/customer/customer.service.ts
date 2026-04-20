import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; phone?: string; orgId: string }) {
    try {
      return await this.prisma.customer.create({ data });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A customer with this phone number already exists',
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

    const where: Prisma.CustomerWhereInput = {
      orgId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      data: customers,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, orgId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, orgId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, orgId: string, data: any) {
    const result = await this.prisma.customer.updateMany({
      where: { id, orgId },
      data,
    });
    if (result.count === 0) throw new NotFoundException('Customer not found');
    return this.findOne(id, orgId);
  }

  // RENAMED FROM 'remove' to 'delete' to match your controller's call
  async delete(id: string, orgId: string) {
    const result = await this.prisma.customer.deleteMany({
      where: { id, orgId },
    });
    if (result.count === 0) throw new NotFoundException('Customer not found');
    return { message: 'Customer deleted successfully' };
  }
}
