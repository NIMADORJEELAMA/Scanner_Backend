import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, orgId: string) {
    try {
      return await this.prisma.category.create({
        data: { name, orgId },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Category already exists');
      }
      throw error;
    }
  }

  async findAll(orgId: string) {
    return this.prisma.category.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, orgId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, orgId: string, name: string) {
    const result = await this.prisma.category.updateMany({
      where: { id, orgId },
      data: { name },
    });
    if (result.count === 0) throw new NotFoundException('Category not found');
    return { id, name };
  }

  async delete(id: string, orgId: string) {
    const result = await this.prisma.category.deleteMany({
      where: { id, orgId },
    });
    if (result.count === 0) throw new NotFoundException('Category not found');
    return { message: 'Category deleted successfully' };
  }
}
