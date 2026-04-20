import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
// PrismaModule should be exported from its own module to be used here

@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService], // Export it so the SalesModule can use it later
})
export class CustomerModule {}
