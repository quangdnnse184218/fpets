// Kiểu dữ liệu UI dùng sau khi map từ các bảng Supabase (xem src/lib/adapters.ts)

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: "food" | "toy" | "accessory";
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  stock: number;
  species: "dog" | "cat" | "both";
  targetSize: "small" | "large" | "all";
  targetAge: "puppy_kitten" | "adult" | "senior" | "all";
  ingredients: string[];
  description: string;
  placeholderColor: string;
  image: string;
}

export interface BoxType {
  id: string;
  name: string;
  slug: string;
  species: "dog" | "cat";
  size: "small" | "large";
  sizeLabel: string;
  itemCount: string;
  minRetailValue: number;
  basePrice: number;
  description: string;
  imageUrl: string;
  typicalItems: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  cycles: number;
  discountPercent: number;
  freeShipping: boolean;
  birthdayGift: boolean;
  badge?: string;
  description: string;
}

export interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  weight: number;
  size: "small" | "large";
  ageGroup: "puppy_kitten" | "adult" | "senior";
  ageLabel: string;
  gender: "Đực" | "Cái";
  birthdate?: string;
  allergies: string[];
  preferences: string[];
  notes?: string;
  avatarColor: string;
  // Đường dẫn trong bucket riêng tư pet-avatars (<user_id>/...), hiển thị qua signed URL
  avatarPath?: string;
}
