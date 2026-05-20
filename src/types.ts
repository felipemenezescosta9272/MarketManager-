export interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_level: number;
  image_url?: string;
  supplier_name?: string;
}

export interface Batch {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  expiry_date: string;
  received_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  cnpj: string;
  contact: string;
  phone: string;
  email: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  document: string;
  points: number;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer_name?: string;
  total_amount: number;
  discount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  notes?: string;
}

export interface Bill {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  category: string;
  supplier_id: number;
  supplier_name?: string;
  is_recurring: boolean;
}

export interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  tenant_id: number | null;
  is_super_admin: boolean;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  license_type?: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  license_start_date?: string;
  license_end_date?: string;
  created_at: string;
}

export interface CashSession {
  id: number;
  user_id: number;
  initial_value: number;
  final_value?: number;
  expected_value?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}
