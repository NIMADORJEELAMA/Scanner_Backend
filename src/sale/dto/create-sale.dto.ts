export class CreateSaleItemDto {
  productId: string;
  quantity: number;
  price: number; // Price at the time of sale (in case it changes later)
}

export class CreateSaleDto {
  userId: string;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  totalAmount: number;
  discount: number;
  finalAmount: number;
  items: CreateSaleItemDto[];
}
