// Environment
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const IS_DEVELOPMENT = NODE_ENV === "development";

// Server Configuration
export const SERVER = {
  PORT: parseInt(process.env.PORT || "3000"),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173"],
} as const;

// Cache Configuration
export const CACHE = {
  TTL: 10 * 60 * 1000, // 10 minutes in milliseconds
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  MESSAGE: "Too many requests from this IP, please try again later.",
} as const;

// File Upload Configuration
export const UPLOAD = {
  DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880"), // 5MB default
  MAX_FILE_SIZE_MB: Math.round(parseInt(process.env.MAX_FILE_SIZE || "5242880") / 1024 / 1024),
} as const;

// Logging Configuration
export const LOGGING = {
  DIR: process.env.LOG_DIR || "logs",
  MAX_LOG_SIZE: parseInt(process.env.MAX_LOG_SIZE || "10485760"), // 10MB
  MAX_LOG_FILES: parseInt(process.env.MAX_LOG_FILES || "5"),
} as const;

// Database Configuration
export const DATABASE = {
  LOG_QUERIES: IS_DEVELOPMENT,
} as const;

// Product Service Configuration
export const PRODUCT_SERVICE = {
  MAX_SEARCH_LIMIT: 100,
  DEFAULT_SEARCH_LIMIT: 20,
  DELETE_BATCH_SIZE: 1000,
  BULK_UPSERT_BATCH_SIZE: 50,
} as const;

// Scraping Configuration
export const SCRAPING = {
  ENABLED: process.env.SCRAPING_ENABLED === "true",
  INTERVAL_HOURS: parseInt(process.env.SCRAPING_INTERVAL_HOURS || "24"),
  DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  USER_AGENT:
    process.env.USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  VIEWPORT: {
    WIDTH: 1280,
    HEIGHT: 720,
  },
  SUPPORTED_BRANDS: ["zara"] as const,
  DISABLED_BRANDS: process.env.DISABLED_BRANDS?.split(",") || [], // Brands to temporarily disable
  MAX_PAGES: {
    ZARA: 2,
  },
} as const;

// Cleanup Configuration
export const CLEANUP = {
  OLD_JOBS_DAYS: 7,
  OLD_PRODUCTS_DAYS: 30,
} as const;

// Validation Configuration
export const VALIDATION = {
  CLOSET_ITEM: {
    NAME_MIN: 1,
    NAME_MAX: 100,
    BRAND_MIN: 1,
    BRAND_MAX: 50,
  },
  SEARCH: {
    QUERY_MAX: 100,
    BRAND_MAX: 50,
    CATEGORY_MAX: 50,
    SOURCE_MAX: 20,
  },
} as const;

// Cache Service Configuration
export const CACHE_SERVICE = {
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

// Health Check Configuration
export const HEALTH_CHECK = {
  TIMEOUT: 30000, // 30 seconds
  RETRIES: 3,
  INTERVAL: 30000, // 30 seconds
  START_PERIOD: 5000, // 5 seconds
} as const;

// Legacy exports for backward compatibility
export const CACHE_TTL = CACHE.TTL;
