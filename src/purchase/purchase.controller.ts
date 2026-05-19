import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PurchaseService, CreatePurchaseDto } from './purchase.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('purchases')
@UseGuards(JwtAuthGuard) // Protect routes and inject req.user
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  create(@Req() req: any, @Body() createData: CreatePurchaseDto) {
    const orgId = req.user.orgId;
    const userId = req.user.id; // Or req.user.userId depending on your JWT payload

    return this.purchaseService.create(orgId, userId, createData);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const orgId = req.user.orgId;

    return this.purchaseService.findAll({
      orgId,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.orgId;
    return this.purchaseService.findOne(id, orgId);
  }
}
