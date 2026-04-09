// src/product/dto/bulk-product.dto.ts
import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class SingleProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  stockQty: number;

  @IsString()
  unit: string;

  @IsString()
  categoryId: string;
}

export class BulkProductDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleProductDto)
  products: SingleProductDto[];
}
