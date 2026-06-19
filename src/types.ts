export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  images: string[];
  stock: number;
  sizes?: string[];
  isFeatured?: boolean;
  createdAt: any;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'confirmed' | 'failed';
  createdAt: any;
  deliveryAddress: {
    fullName: string;
    street: string;
    city: string;
    zipCode: string;
    phone: string;
  };
  trackingNumber?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface UserProfile {
  email: string;
  role: 'customer' | 'admin';
  wishlist: string[];
}
