import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(3, { message: 'Name is too short' })
  name: string;

  @IsString()
  @IsOptional()
  // Basic regex for 10-digit numbers, adjust for your region
  @Matches(/^[0-9]{10,15}$/, { message: 'Please enter a valid phone number' })
  phone?: string;
}

export class UpdateCustomerDto extends CreateCustomerDto {}
