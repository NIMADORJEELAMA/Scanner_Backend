import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  lineDiscount: number;

  @IsOptional()
  @IsNumber()
  taxRate: number;
}

export class CreateSaleDto {
  @IsEnum(['CASH', 'UPI', 'CARD', 'SPLIT'])
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  taxAmount: number; // The calculated tax amount (e.g., 507.6)

  @IsNumber()
  @IsOptional()
  gstPercentage?: number; // The rate used (e.g., 10)

  @IsNumber()
  finalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
