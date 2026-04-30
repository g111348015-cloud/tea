export interface Category {
  id: string;
  name: string;
  englishName?: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  englishName?: string;
  categoryId: string;
  priceM?: number;
  priceL?: number;
  isPopular?: boolean;
  isHot?: boolean;
  description?: string;
  image?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  size: 'M' | 'L';
  sugar: string;
  ice: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  customerName: string;
  uid: string;
  createdAt: any; // ServerTimestamp
  updatedAt?: any;
}
