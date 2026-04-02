import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Create a new category scoped to the Organization
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body('name') name: string, @Req() req: any) {
    // Only pass the name and orgId to the service
    return this.categoryService.create(name, req.user.orgId);
  }

  /**
   * Get all categories for the current Organization
   */
  @Get()
  findAll(@Req() req: any) {
    return this.categoryService.findAll(req.user.orgId);
  }

  /**
   * Find a single category (Scoped)
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.categoryService.findOne(id, req.user.orgId);
  }

  /**
   * Update category name (Scoped)
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body('name') name: string, @Req() req: any) {
    return this.categoryService.update(id, req.user.orgId, name);
  }

  /**
   * Delete category (Scoped)
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoryService.delete(id, req.user.orgId);
  }
}
