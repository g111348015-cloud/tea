export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  options?: {
    ice?: string;
    sugar?: string;
  };
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
}

export interface CartItem extends OrderItem {
  image?: string;
}
