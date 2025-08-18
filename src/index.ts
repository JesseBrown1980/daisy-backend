import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";

import { SERVER, RATE_LIMIT, SCRAPING, NODE_ENV } from "./config/app";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import closetRoutes from "./routes/closet";
import productRoutes from "./routes/products";
import scrapeRoutes from "./routes/scrape";

import { startCronJobs } from "./services/scheduler";
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: SERVER.ALLOWED_ORIGINS,
    credentials: true,
  })
);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests for static files
  })
);
app.use(compression());

// Static files for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: RATE_LIMIT.MESSAGE,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

// API routes
app.use("/api/v1/closet", closetRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/scrape", scrapeRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(SERVER.PORT, () => {
  logger.info(`🚀 Server running on port ${SERVER.PORT}`);
  logger.info(`📖 API Documentation available at http://localhost:${SERVER.PORT}/api/v1`);

  // Start background jobs
  if (SCRAPING.ENABLED) {
    startCronJobs();
    logger.info("🕒 Scheduled scraping jobs started");
  }
});

export default app;
