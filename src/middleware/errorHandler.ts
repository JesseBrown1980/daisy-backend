import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { sendError } from "../utils/response";
import { AppError } from "../utils/AppError";
import { IS_DEVELOPMENT, IS_PRODUCTION, UPLOAD } from "../config/app";

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  // Log error with request context
  const errorContext = {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  };

  logger.error(`Error in ${req.method} ${req.path}:`, error);

  if (IS_DEVELOPMENT) {
    logger.error("Request context:", errorContext);
  }

  // Handle custom AppError instances
  if (error instanceof AppError) {
    sendError(res, error.message, error.statusCode, error.code);
    return;
  }

  // Prisma errors
  if (error.code === "P2002") {
    const field = error.meta?.target?.[0] || "field";
    sendError(res, `A record with this ${field} already exists`, 409, "DUPLICATE_ENTRY");
    return;
  }

  if (error.code === "P2025") {
    sendError(res, "Record not found", 404, "NOT_FOUND");
    return;
  }

  if (error.code?.startsWith("P")) {
    sendError(res, "Database operation failed", 400, "DATABASE_ERROR");
    return;
  }

  // Validation errors (Joi)
  if (error.name === "ValidationError" || error.isJoi) {
    const message = error.details ? error.details.map((detail: any) => detail.message).join(", ") : error.message;
    sendError(res, message, 400, "VALIDATION_ERROR");
    return;
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    sendError(res, "Invalid token", 401, "INVALID_TOKEN");
    return;
  }

  if (error.name === "TokenExpiredError") {
    sendError(res, "Token expired", 401, "TOKEN_EXPIRED");
    return;
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    sendError(res, `File too large. Maximum size is ${UPLOAD.MAX_FILE_SIZE_MB}MB`, 413, "FILE_TOO_LARGE");
    return;
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    sendError(res, 'Unexpected file field. Only "image" field is allowed', 400, "UNEXPECTED_FILE");
    return;
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    sendError(res, "Too many files. Only one file is allowed", 400, "TOO_MANY_FILES");
    return;
  }

  // Rate limiting errors
  if (error.status === 429) {
    sendError(res, "Too many requests. Please try again later", 429, "TOO_MANY_REQUESTS");
    return;
  }

  // Syntax errors
  if (error instanceof SyntaxError && "body" in error) {
    sendError(res, "Invalid JSON in request body", 400, "INVALID_JSON");
    return;
  }

  // Network/timeout errors
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    sendError(res, "External service unavailable", 503, "SERVICE_UNAVAILABLE");
    return;
  }

  const status = error.status || error.statusCode || 500;
  const message = IS_PRODUCTION ? "Internal server error" : error.message || "Internal server error";

  sendError(res, message, status);
};
