import { ScrapingConfig } from "../../types";
import { SCRAPING } from "../../config/app";

export const SCRAPING_CONFIGS: Record<string, ScrapingConfig> = {
  zara: {
    brand: "Zara",
    baseUrl: "https://www.zara.com",
    categoryUrls: [
      "https://www.zara.com/us/en/search?searchTerm=shirt&section=WOMAN",
      "https://www.zara.com/us/en/search?searchTerm=dress&section=WOMAN",
      "https://www.zara.com/us/en/search?searchTerm=jeans&section=WOMAN",
    ],
    selectors: {
      productContainer: "li[data-productid], .product-grid-product, .product",
      name: "h3, .product-name, .product-title",
      price: ".price, .product-grid-product-info__product-price, .product-price",
      image:
        "picture img, .media-image img, .product-media img, [data-testid*='image'] img, img[alt*='product'], img[src*='product']",
      link: ".product-link, .product-grid-product__link, a[href*='p0']",
      inStock: ".product-item-availability, .availability",
    },
    pagination: {
      nextButton: '.pagination-next, [data-testid="pagination-next"], .load-more, .js-seo-see-more',
      maxPages: SCRAPING.MAX_PAGES.ZARA,
    },
  },
};

// Fallback selectors for when specific brand selectors don't work
export const FALLBACK_SELECTORS = {
  productContainer: [
    "li[data-productid]",
    ".product-grid-product",
    ".product-item",
    ".product-card",
    ".product-tile",
    '[data-testid*="product"]',
    ".item",
    ".product",
  ],
  name: [
    "h3",
    ".product-name",
    ".product-title",
    ".item-name",
    ".title",
    "h2",
    "h4",
    '[data-testid*="name"]',
    '[data-testid*="title"]',
  ],
  price: [
    ".price",
    ".product-grid-product-info__product-price",
    ".product-price",
    ".item-price",
    '[data-testid*="price"]',
    ".cost",
    ".amount",
  ],
  image: [
    "picture img",
    ".media-image img",
    ".product-media img",
    ".product-image img",
    ".item-image img",
    'img[alt*="product"]',
    'img[src*="product"]',
    'img[data-testid*="image"]',
    ".media-wrapper img",
    ".gallery-image img",
    "img",
  ],
  link: [
    ".product-link",
    ".product-grid-product__link",
    'a[href*="product"]',
    'a[href*="item"]',
    'a[href*="p0"]',
    ".item-link",
    "a",
  ],
};

export const SCRAPING_SETTINGS = {
  delayBetweenRequests: SCRAPING.DELAY_BETWEEN_REQUESTS,
  timeout: SCRAPING.TIMEOUT,
  maxRetries: SCRAPING.MAX_RETRIES,
  userAgent: SCRAPING.USER_AGENT,
  viewport: SCRAPING.VIEWPORT,
};
