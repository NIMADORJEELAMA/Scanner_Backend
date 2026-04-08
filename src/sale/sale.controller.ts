import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: any, @Req() req: any) {
    const userId = req.user.id;
    const orgId = req.user.orgId;
    return this.saleService.create(dto, userId, orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = req.user.orgId; // Security: Only fetch sales for the user's organization
    return this.saleService.findAll(orgId, { search, startDate, endDate });
  }
}
