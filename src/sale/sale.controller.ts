import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { SaleService } from './sale.service';
import { JwtAuthGuard } from '../auth/jwt.guard'; // Adjust path to your guard

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: any, @Req() req: any) {
    const userId = req.user.id;
    const orgId = req.user.orgId; // Extract from JWT
    return this.saleService.create(dto, userId, orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.saleService.findAll();
  }
}
