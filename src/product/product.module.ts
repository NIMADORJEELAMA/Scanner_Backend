import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
// PrismaModule should be exported from its own module to be used here

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService], // Export it so the SalesModule can use it later
})
export class ProductModule {}
