import puppeteer, { Browser, Page } from "puppeteer";
import * as cheerio from "cheerio";
import { ScrapedProduct, ScrapingConfig } from "../../types";
import {
  SCRAPING_CONFIGS,
  FALLBACK_SELECTORS,
  SCRAPING_SETTINGS,
} from "./config";
import { logger } from "../../utils/logger";

export class WebScraper {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-http2", // Disable HTTP/2 to avoid protocol errors
          "--ignore-certificate-errors",
          "--ignore-ssl-errors",
          "--disable-blink-features=AutomationControlled", // Hide automation
        ],
        ignoreDefaultArgs: ["--enable-automation"], // Remove automation flag
      });
      logger.info("Browser initialized for scraping");
    } catch (error) {
      logger.error("Failed to initialize browser:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info("Browser closed");
    }
  }

  async scrapeProducts(source: string): Promise<ScrapedProduct[]> {
    if (!this.browser) {
      await this.init();
    }

    const config = SCRAPING_CONFIGS[source.toLowerCase()];
    if (!config) {
      throw new Error(`Scraping configuration not found for source: ${source}`);
    }

    logger.info(`Starting to scrape products from ${config.brand}`);
    const allProducts: ScrapedProduct[] = [];

    try {
      for (const categoryUrl of config.categoryUrls) {
        logger.info(`Scraping category: ${categoryUrl}`);
        const categoryProducts = await this.scrapeCategoryPage(
          categoryUrl,
          config
        );
        allProducts.push(...categoryProducts);

        // Delay between categories to be respectful
        await this.delay(SCRAPING_SETTINGS.delayBetweenRequests);
      }

      logger.info(
        `Scraped ${allProducts.length} products from ${config.brand}`
      );
      return allProducts;
    } catch (error) {
      logger.error(`Error scraping products from ${config.brand}:`, error);
      throw error;
    }
  }

  private async scrapeCategoryPage(
    url: string,
    config: ScrapingConfig
  ): Promise<ScrapedProduct[]> {
    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      // Enhanced stealth setup
      await page.setUserAgent(SCRAPING_SETTINGS.userAgent);
      await page.setViewport({
        width: SCRAPING_SETTINGS.viewport.WIDTH,
        height: SCRAPING_SETTINGS.viewport.HEIGHT,
      });

      // Add extra headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      });

      // Hide webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
      });

      // Set timeout and wait for network to be idle with retry logic
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded", // Changed from networkidle2 for better reliability
            timeout: SCRAPING_SETTINGS.timeout,
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          retries++;
          if (retries >= maxRetries) {
            // Check if it's a protocol error that we should skip
            if (
              error.message?.includes("ERR_HTTP2_PROTOCOL_ERROR") ||
              error.message?.includes("net::ERR_") ||
              error.message?.includes("Protocol error")
            ) {
              logger.error(
                `Skipping ${url} due to protocol error: ${error.message}`
              );
              return products; // Return empty array instead of throwing
            }
            throw error; // Re-throw other errors
          }
          logger.warn(
            `Retry ${retries}/${maxRetries} for ${url}: ${error.message}`
          );
          await this.delay(2000 * retries); // Progressive delay
        }
      }

      // Wait a bit for dynamic content to load
      await this.delay(3000);

      // Wait for images to load (especially lazy-loaded ones)
      await this.waitForImages(page);

      let currentPage = 1;
      const maxPages = config.pagination?.maxPages || 1;

      while (currentPage <= maxPages) {
        logger.info(`Scraping page ${currentPage} of ${url}`);

        // Get page content
        const content = await page.content();
        const pageProducts = this.parseProductsFromHTML(content, config, url);
        products.push(...pageProducts);

        logger.info(
          `Found ${pageProducts.length} products on page ${currentPage}`
        );

        // Try to navigate to next page
        if (currentPage < maxPages && config.pagination?.nextButton) {
          const hasNextPage = await this.goToNextPage(
            page,
            config.pagination.nextButton
          );
          if (!hasNextPage) {
            logger.info("No more pages available");
            break;
          }
          currentPage++;
          await this.delay(SCRAPING_SETTINGS.delayBetweenRequests);
        } else {
          break;
        }
      }
    } catch (error) {
      logger.error(`Error scraping category page ${url}:`, error);
    } finally {
      await page.close();
    }

    return products;
  }

  private parseProductsFromHTML(
    html: string,
    config: ScrapingConfig,
    baseUrl: string
  ): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    // Try to find product containers
    const productContainers = this.findElements(
      $,
      config.selectors.productContainer,
      FALLBACK_SELECTORS.productContainer
    );

    productContainers.each((index, element) => {
      try {
        const $element = $(element);

        // Extract product information
        const name = this.extractText(
          $element,
          config.selectors.name,
          FALLBACK_SELECTORS.name
        );
        const priceText = this.extractText(
          $element,
          config.selectors.price,
          FALLBACK_SELECTORS.price
        );
        const imageUrl = this.extractProductImage(
          $,
          $element,
          config.selectors.image,
          FALLBACK_SELECTORS.image
        );
        const productLink = this.extractAttribute(
          $element,
          config.selectors.link,
          "href",
          FALLBACK_SELECTORS.link
        );

        // Skip if essential information is missing
        if (!name || !priceText || !imageUrl || !productLink) {
          return;
        }

        // Parse price
        const price = this.parsePrice(priceText);
        if (price === null) {
          return;
        }

        // Resolve URLs
        const fullImageUrl = this.resolveUrl(imageUrl, config.baseUrl);
        const fullProductUrl = this.resolveUrl(productLink, config.baseUrl);

        const product: ScrapedProduct = {
          name: name.trim(),
          brand: config.brand,
          price,
          imageUrl: fullImageUrl,
          productUrl: fullProductUrl,
        };

        products.push(product);
      } catch (error) {
        logger.error(`Error parsing product at index ${index}:`, error);
      }
    });

    return products;
  }

  private findElements(
    $: cheerio.CheerioAPI,
    primary: string,
    fallbacks: string[]
  ): cheerio.Cheerio<any> {
    let elements = $(primary);

    if (elements.length === 0) {
      for (const fallback of fallbacks) {
        elements = $(fallback);
        if (elements.length > 0) {
          break;
        }
      }
    }

    return elements;
  }

  private extractText(
    $element: cheerio.Cheerio<any>,
    primary: string,
    fallbacks: string[]
  ): string | null {
    let text = $element.find(primary).first().text().trim();

    if (!text) {
      for (const fallback of fallbacks) {
        text = $element.find(fallback).first().text().trim();
        if (text) break;
      }
    }

    return text || null;
  }

  /**
   * Extract product image URL while filtering out placeholder/transparent images
   */
  private extractProductImage(
    $: cheerio.CheerioAPI,
    $element: cheerio.Cheerio<any>,
    primary: string,
    fallbacks: string[]
  ): string | null {
    // List of placeholder/transparent image patterns to avoid
    const placeholderPatterns = [
      "transparent-background",
      "placeholder",
      "loading",
      "lazy-load",
      "spacer",
      "blank",
      "1x1",
      "pixel",
      "empty",
      "loader.gif",
      "loader.png",
      "loader.webp",
      "spinner",
      "preloader",
      "default",
      "noimage",
    ];

    // Try all possible image attributes
    const attributes = [
      "src",
      "data-src",
      "data-original",
      "data-lazy",
      "data-url",
      "data-zoom-image",
      "data-large-image",
      "data-full-image",
      "data-hires",
      "data-image",
      "data-thumb",
      "data-product-image",
      "srcset", // Often contains multiple sizes
    ];

    // Get all potential images from the element
    const allSelectors = [primary, ...fallbacks];
    const candidateImages: string[] = [];

    for (const selector of allSelectors) {
      const images = $element.find(selector).addBack(selector);

      images.each((_, img) => {
        for (const attr of attributes) {
          const imageUrl = $(img).attr(attr);
          if (imageUrl && imageUrl.trim()) {
            if (attr === "srcset") {
              // Parse srcset to get the largest image
              const srcsetImages = imageUrl
                .split(",")
                .map((src) => src.trim().split(" ")[0])
                .filter((src) => src && src.length > 0);
              candidateImages.push(...srcsetImages);
            } else {
              candidateImages.push(imageUrl.trim());
            }
          }
        }
      });
    }

    // Filter and prioritize images
    const validImages = candidateImages
      .filter((url) => {
        // Remove duplicates and invalid URLs
        if (!url || url.length < 5) return false;

        // Skip placeholder images
        const urlLower = url.toLowerCase();
        if (placeholderPatterns.some((pattern) => urlLower.includes(pattern))) {
          return false;
        }

        // Skip data URLs (often placeholders)
        if (url.startsWith("data:")) return false;

        // Skip very small images (likely spacers/pixels)
        if (url.includes("1x1") || url.includes("spacer")) return false;

        return true;
      })
      .filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates

    // Prioritize images that look like product images
    const prioritizedImages = validImages.sort((a, b) => {
      // Prefer larger images (often contain dimensions in URL)
      const aHasSize = /\d{3,4}x\d{3,4}|\d{3,4}w|\d{3,4}h/i.test(a);
      const bHasSize = /\d{3,4}x\d{3,4}|\d{3,4}w|\d{3,4}h/i.test(b);

      if (aHasSize && !bHasSize) return -1;
      if (!aHasSize && bHasSize) return 1;

      // Prefer images with "product" or "item" in the URL
      const aIsProduct = /product|item|catalog/i.test(a);
      const bIsProduct = /product|item|catalog/i.test(b);

      if (aIsProduct && !bIsProduct) return -1;
      if (!aIsProduct && bIsProduct) return 1;

      // Prefer HTTPS over HTTP
      if (a.startsWith("https://") && b.startsWith("http://")) return -1;
      if (a.startsWith("http://") && b.startsWith("https://")) return 1;

      return 0;
    });

    // Return the best candidate
    return prioritizedImages.length > 0 ? prioritizedImages[0] : null;
  }

  private extractAttribute(
    $element: cheerio.Cheerio<any>,
    primary: string,
    attr: string,
    fallbacks: string[]
  ): string | null {
    let value = $element.find(primary).first().attr(attr);

    if (!value) {
      for (const fallback of fallbacks) {
        value = $element.find(fallback).first().attr(attr);
        if (value) break;
      }
    }

    return value || null;
  }

  private parsePrice(priceText: string): number | null {
    // Handle sale prices (e.g., "$ 59.90-40%$ 35.94" -> get the final price 35.94)
    const salePattern = /\$\s*([\d.,]+)\s*-\s*\d+%\s*\$\s*([\d.,]+)/;
    const saleMatch = priceText.match(salePattern);

    if (saleMatch) {
      const salePrice = parseFloat(saleMatch[2].replace(",", "."));
      return isNaN(salePrice) ? null : salePrice;
    }

    // Handle regular prices - extract the first price found
    const pricePattern = /\$\s*([\d.,]+)/;
    const priceMatch = priceText.match(pricePattern);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(",", "."));
      return isNaN(price) ? null : price;
    }

    // Fallback: remove currency symbols and extract number
    const cleanPrice = priceText.replace(/[^\d.,]/g, "");
    const price = parseFloat(cleanPrice.replace(",", "."));

    return isNaN(price) ? null : price;
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http")) {
      return url;
    }

    if (url.startsWith("//")) {
      return "https:" + url;
    }

    if (url.startsWith("/")) {
      return baseUrl + url;
    }

    return baseUrl + "/" + url;
  }

  private async goToNextPage(
    page: Page,
    nextButtonSelector: string
  ): Promise<boolean> {
    try {
      const nextButton = await page.$(nextButtonSelector);
      if (!nextButton) {
        return false;
      }

      // Simple approach: try to click and see if it works
      try {
        await nextButton.click();
        await page.waitForTimeout(3000); // Wait for page to load
        return true;
      } catch (clickError) {
        // If click fails, button might be disabled
        logger.info("Next button click failed, likely disabled");
        return false;
      }
    } catch (error) {
      logger.error("Error navigating to next page:", error);
      return false;
    }
  }

  /**
   * Wait for lazy-loaded images to appear by scrolling and waiting
   */
  private async waitForImages(page: Page): Promise<void> {
    try {
      // Scroll down slowly to trigger lazy loading
      await page.evaluate(async () => {
        const scrollDistance = 500;
        const scrollDelay = 500;
        let totalHeight = 0;
        const distance = scrollDistance;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
          }
        }, scrollDelay);

        // Wait for scrolling to complete
        await new Promise((resolve) => setTimeout(resolve, 5000));
      });

      // Wait for images that might be loading
      await page
        .waitForFunction(
          () => {
            const images = Array.from(document.querySelectorAll("img"));
            // Check if most images are loaded (not showing loaders/placeholders)
            const loadedImages = images.filter((img) => {
              const src = img.src || img.getAttribute("data-src") || "";
              return (
                src && !src.includes("loader") && !src.includes("placeholder")
              );
            });
            return loadedImages.length > 0 || images.length === 0;
          },
          { timeout: 10000 }
        )
        .catch(() => {
          // Timeout is acceptable, continue with whatever we have
          logger.debug(
            "Image loading timeout - continuing with available content"
          );
        });

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await this.delay(1000);
    } catch (error) {
      logger.debug("Error waiting for images, continuing anyway:", error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
