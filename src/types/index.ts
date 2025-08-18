export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Closet Item Types - Simplified to core properties only
export interface ClosetItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClosetItemDto {
  name: string;
  brand: string;
  category: string;
}

export interface UpdateClosetItemDto {
  name?: string;
  brand?: string;
  category?: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  category: string | null;
  description: string | null;
  inStock: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  lastCrawled: Date;
}

export interface SearchFilters {
  query?: string;
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  source?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Scraping Types
export interface ScrapedProduct {
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  productUrl: string;
}

export interface CrawlJob {
  id: string;
  source: string;
  status: string; // "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  itemsFound: number;
  itemsSaved: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapingConfig {
  brand: string;
  baseUrl: string;
  categoryUrls: string[];
  selectors: {
    productContainer: string;
    name: string;
    price: string;
    image: string;
    link: string;
    inStock?: string;
  };
  pagination?: {
    nextButton?: string;
    maxPages?: number;
  };
}

// Categories for clothing items
export const CLOTHING_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Shoes",
  "Accessories",
  "Bags",
  "Jewelry",
  "Underwear",
  "Activewear",
] as const;

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];
