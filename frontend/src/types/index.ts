export interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Permissions {
  [key: string]: Permission | undefined;
  products?: Permission;
  categories?: Permission;
  sales?: Permission;
  salesHistory?: Permission;
  orders?: Permission;
  expenses?: Permission;
  reports?: Permission;
  users?: Permission;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  companyId?: string;
  permissions?: Permissions;
  isActive: boolean;
  company?: Company;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  plan: string;
  maxUsers: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  displayName: string;
  categoryId: string;
  category?: Category;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  sku?: string;
  prepTime?: number;
  cost?: number;
  stock?: number;
  tags: string[];
  hasPromotion: boolean;
  promotionDiscount?: number;
  nutritionalInfo?: string;
  allergens?: string;
  priority: number;
  availableSchedule?: {
    start: string;
    end: string;
  };
  variations?: ProductVariation[];
  additions?: ProductAddition[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  priority: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariation {
  id?: string;
  name: string;
  value: string;
  priceAdjust: number;
}

export interface ProductAddition {
  id?: string;
  name: string;
  price: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}
