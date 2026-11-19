export interface Game {
  id: string;
  name_ar: string;
  name_en: string;
  accent_color: string;
  sort_order: number;
}

export interface Package {
  id: string;
  game_id: string;
  label_ar: string;
  price_sdg: number;
  sort_order: number;
}

export interface PaymentMethod {
  id: string;
  name_ar: string;
  account_label_ar: string;
  account_value: string;
  instructions_ar: string | null;
  sort_order: number;
  is_active: boolean;
}

export type TopUpMethodId = 'fawry' | 'mycashi';

export type TopUpStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'customer' | 'owner';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  balance: number;
  points: number;
}

export interface TopUpRequest {
  id: string;
  userId: string;
  amount: number;
  method: TopUpMethodId;
  transactionNumber: string;
  receiptPath: string;
  status: TopUpStatus;
  createdAt: string;
}

export interface TopUpWithUser extends TopUpRequest {
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
}

export type OrderStatus = 'pending' | 'completed' | 'rejected';

export interface StoreOrder {
  id: string;
  customerName: string | null;
  whatsapp: string;
  gameName: string;
  gameEn: string;
  packageLabel: string;
  playerId: string;
  amount: number;
  paymentName: string;
  payerAccount: string | null;
  receiptPath: string | null;
  status: OrderStatus;
  createdAt: string;
  reviewedAt: string | null;
  userId: string | null;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
}

export interface Catalog {
  games: Game[];
  packages: Package[];
  paymentMethods: PaymentMethod[];
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface PublicReview {
  id: string;
  customerName: string;
  gameName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PublicReviews {
  total: number;
  average: number;
  reviews: PublicReview[];
}

export interface AdminReview extends PublicReview {
  gameId: string | null;
  source: 'customer' | 'owner';
  status: ReviewStatus;
  orderId: string | null;
}
