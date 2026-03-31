import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, dto: UpdateUserDto) {
    const { password, ...otherData } = dto;
    const updateData: any = { ...otherData };

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async deleteUser(id: string) {
    // 1. Fetch user and count 'sales' (not orders)
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true }, // Changed from orders to sales
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 2. Check for sales history
    if (user._count.sales > 0) {
      throw new ConflictException(
        `Cannot delete user ${user.name} because they have existing sales history. Deactivate the account instead.`,
      );
    }

    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updateFcmToken(userId: string, token: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token },
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        // Only include relations that actually exist in your schema.prisma
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Optional: limit to last 10 sales
        },
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
}
