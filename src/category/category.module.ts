import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
// PrismaModule should be exported from its own module to be used here

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], // Export it so the SalesModule can use it later
})
export class CategoryModule {}
