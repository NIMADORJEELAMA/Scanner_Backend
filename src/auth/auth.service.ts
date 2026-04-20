import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true }, // Include org details
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 🔥 SAAS KEY: Include orgId in the payload
    const payload = {
      sub: user.id,
      orgId: user.orgId, // Every request now knows which store it belongs to
      role: user.role,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        organization: user.organization.name,
      },
    };
  }

  /**
   * Standard Register (Adds staff to an existing Org)
   */
  async register(dto: RegisterDto, orgId: string) {
    // Add orgId here
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        orgId: orgId, // <--- THIS FIXES THE ERROR
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        orgId: true,
      },
    });
  }

  /**
   * New Store Onboarding (Creates Org + Admin)
   */
  async onboardStore(dto: any) {
    const hashed = await bcrypt.hash(dto.password, 10);

    // Use a transaction: Don't create the user if the Org fails, or vice-versa
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.storeName,
          address: dto.address,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.adminName,
          email: dto.adminEmail,
          password: hashed,
          role: 'ADMIN',
          orgId: organization.id,
        },
      });

      return { organization, user };
    });
  }
}
