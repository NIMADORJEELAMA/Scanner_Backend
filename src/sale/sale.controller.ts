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
  @Get('report')
  async getReport(
    @Query('orgId') orgId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.saleService.getSalesReport(orgId, start, end);
  }
  // backend/src/sales/sales.controller.ts

  @Get('timeline') // This must match the frontend call
  async getTimeline(
    @Query('orgId') orgId: string,
    @Query('date') date: string,
  ) {
    return this.saleService.getSalesTimeline(orgId, date);
  }
}
