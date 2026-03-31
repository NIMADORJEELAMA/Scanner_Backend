import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@UseGuards(JwtAuthGuard) // Apply to the whole controller
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: any, @Req() req: any) {
    // Pass orgId from token to service
    return this.productService.create(data, req.user.orgId);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.productService.findAll(req.user.orgId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : 10,
      search,
      categoryId,
      isActive: isActive === undefined ? true : isActive === 'true',
    });
  }

  /**
   * Barcode scanner endpoint
   */
  @UseGuards(JwtAuthGuard) // MUST be here
  @Get('barcode/:barcode')
  async findByBarcode(@Param('barcode') barcode: string, @Req() req: any) {
    console.log('User from Req:', req.user); // DEBUG: Ensure orgId is here

    if (!req.user?.orgId) {
      throw new UnauthorizedException('Organization ID missing from token');
    }

    return this.productService.findByBarcode(req.user.orgId, barcode);
  }
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productService.findOne(id, req.user.orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: Prisma.ProductUpdateInput,
    @Req() req: any,
  ) {
    return this.productService.update(id, req.user.orgId, data);
  }

  /**
   * Soft Delete
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productService.deactivate(id, req.user.orgId);
  }
}
