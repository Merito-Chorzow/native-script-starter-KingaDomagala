export interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  status: ProductStatus;
  imageUrl?: string;
  quantity: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  InStock = 'in_stock',
  LowStock = 'low_stock',
  OutOfStock = 'out_of_stock',
  Pending = 'pending',
}

export interface ProductCreateDto {
  name: string;
  code: string;
  description: string;
  quantity: number;
  category: string;
  imageUrl?: string;
}

export interface ProductUpdateDto {
  name?: string;
  code?: string;
  description?: string;
  quantity?: number;
  category?: string;
  status?: ProductStatus;
  imageUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

