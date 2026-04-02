import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';

import { QzModule } from './qz/qz.module';
import { ProductService } from './product/product.service';
import { ProductModule } from './product/product.module';
import { SaleService } from './sale/sale.service';
import { SaleModule } from './sale/sale.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // UsersModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ProductModule,
    SaleModule,
    CategoryModule,

    QzModule,
  ],
  providers: [SaleService],
})
// export class AppModule {}
export class AppModule implements OnModuleInit {
  onModuleInit() {
    console.log('--- DATABASE CHECK ---');
    console.log('Connecting to:', process.env.DATABASE_URL);
    console.log('-----------------------');
  }
}
