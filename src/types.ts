// Client-side shared types. Domain records (customers, products, orders,
// visits) are defined once in server/commerce-types.ts and re-exported here.
export type {
  CustomerRecord as Customer,
  ProductRecord as Product,
  OrderRecord as Order,
  VisitRecord as Visit,
  CustomerType,
  PriceTier,
  B2BChannel,
  LoyaltyTier,
  SalesTarget,
} from '../server/commerce-types';

export type BranchId = 'ALL' | string;

export type ActiveTab =
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'products'
  | 'sales'
  | 'marketing'
  | 'loyalty'
  | 'care'
  | 'inbox';

export interface Branch {
  id: BranchId;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  type: 'office' | 'warehouse' | 'showroom' | 'region' | string;
}

export type UserRole = string;

export interface CurrentUser {
  id: string;
  staffCode?: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  roleTitle: string;
  department?: string;
  branchId?: BranchId;
  status?: 'active' | 'suspended' | 'offline';
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  createdAt?: string;
}
