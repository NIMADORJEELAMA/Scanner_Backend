import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
// PrismaModule should be exported from its own module to be used here

@Module({
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService], // Export it so the SalesModule can use it later
})
export class SaleModule {}
