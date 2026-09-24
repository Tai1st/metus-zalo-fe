/** Bảng giá lấy từ backend (metus-zalo-be). */
export type PricePoint = { months: number; price: number };

export type Plan = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  prices: PricePoint[];
  currency: string;
  features: string[];
  maxUsers: number;
  isPopular: boolean;
  sortOrder: number;
};

/** "+N tài khoản nhân sự" mua thêm cho gói doanh nghiệp. */
export type Addon = {
  id: string;
  code: string;
  name: string;
  seats: number;
  prices: PricePoint[];
  currency: string;
  requiresPlanCode: string;
  sortOrder: number;
};
