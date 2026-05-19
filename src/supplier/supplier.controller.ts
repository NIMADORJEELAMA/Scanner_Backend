import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

// If you are using DTOs, you would import them here:
// import { CreateSupplierDto } from './dto/create-supplier.dto';
// import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard) // Assuming you have an Auth Guard to protect routes
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Req() req: any, @Body() createData: any) {
    // Extract orgId from the authenticated user
    const orgId = req.user.orgId;

    return this.supplierService.create({
      ...createData,
      orgId,
    });
  }
  @Get()
  findAll(
    @Query('orgId') orgId: string, // Require frontend to send ?orgId=...
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.supplierService.findAll({
      orgId,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.orgId;
    return this.supplierService.findOne(id, orgId);
  }
  @Get(':id/purchases')
  getSupplierPurchases(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const orgId = req.user.orgId;
    return this.supplierService.getPurchasesBySupplier(id, orgId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateData: any, // Ideally UpdateSupplierDto
  ) {
    const orgId = req.user.orgId;
    return this.supplierService.update(id, orgId, updateData);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.orgId;
    return this.supplierService.delete(id, orgId);
  }
}
