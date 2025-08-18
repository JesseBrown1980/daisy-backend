import fs from "fs";
import path from "path";
import { IS_DEVELOPMENT, LOGGING } from "../config/app";

interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  performance: (operation: string, duration: number, meta?: any) => void;
}

interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  meta?: any;
  pid: number;
  hostname: string;
}

class ProductionLogger implements Logger {
  private isDevelopment: boolean;
  private logDir: string;
  private maxLogSize: number;
  private maxLogFiles: number;

  constructor() {
    this.isDevelopment = IS_DEVELOPMENT;
    this.logDir = LOGGING.DIR;
    this.maxLogSize = LOGGING.MAX_LOG_SIZE;
    this.maxLogFiles = LOGGING.MAX_LOG_FILES;

    // Ensure log directory exists in production
    if (!this.isDevelopment && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, meta?: any): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      meta: meta || undefined,
      pid: process.pid,
      hostname: require("os").hostname(),
    };
  }

  private writeToFile(level: string, logEntry: LogEntry): void {
    if (this.isDevelopment) return;

    try {
      const filename = path.join(this.logDir, `${level}.log`);
      const logLine = JSON.stringify(logEntry) + "\n";

      // Check file size and rotate if necessary
      if (fs.existsSync(filename)) {
        const stats = fs.statSync(filename);
        if (stats.size > this.maxLogSize) {
          this.rotateLogFile(filename);
        }
      }

      fs.appendFileSync(filename, logLine);
    } catch (error) {
      // Fallback to console if file writing fails
      console.error("Failed to write to log file:", error);
      console.log(JSON.stringify(logEntry));
    }
  }

  private rotateLogFile(filename: string): void {
    try {
      // Rotate existing log files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const currentFile = `${filename}.${i}`;
        const nextFile = `${filename}.${i + 1}`;

        if (fs.existsSync(currentFile)) {
          if (i === this.maxLogFiles - 1) {
            // Delete the oldest file
            fs.unlinkSync(currentFile);
          } else {
            // Rename to next number
            fs.renameSync(currentFile, nextFile);
          }
        }
      }

      // Move current log to .1
      if (fs.existsSync(filename)) {
        fs.renameSync(filename, `${filename}.1`);
      }
    } catch (error) {
      console.error("Failed to rotate log file:", error);
    }
  }

  private sanitizeForProduction(meta: any): any {
    if (!meta || this.isDevelopment) return meta;

    // Remove sensitive information in production
    const sanitized = { ...meta };
    const sensitiveKeys = ["password", "token", "secret", "key", "authorization"];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== "object" || obj === null) return obj;

      const result: any = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
          result[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  info(message: string, meta?: any): void {
    const logEntry = this.formatMessage("INFO", message, this.sanitizeForProduction(meta));

    if (this.isDevelopment) {
      console.log(`[INFO] ${logEntry.timestamp} - ${message}`);
      if (meta) {
        console.log(JSON.stringify(meta, null, 2));
      }
    } else {
      console.log(JSON.stringify(logEntry));
      this.writeToFile("info", logEntry);
    }
  }

  error(message: string, error?: any): void {
    const errorMeta: any = {};

    if (error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status || error.statusCode,
      };

      if (this.isDevelopment && error.stack) {
        errorMeta.error.stack = error.stack;
      }

      // Add additional context if available
      if (error.meta) {
        errorMeta.error.meta = this.sanitizeForProduction(error.meta);
      }
    }

    const logEntry = this.formatMessage("ERROR", message, errorMeta);

    if (this.isDevelopment) {
      console.error(`[ERROR] ${logEntry.timestamp} - ${message}`);
      if (error) {
        console.error("Error details:", error);
        if (error.stack) {
          console.error("Stack trace:", error.stack);
        }
      }
    } else {
      console.error(JSON.stringify(logEntry));
      this.writeToFile("error", logEntry);
    }
  }

  warn(message: string, meta?: any): void {
    const logEntry = this.formatMessage("WARN", message, this.sanitizeForProduction(meta));

    if (this.isDevelopment) {
      console.warn(`[WARN] ${logEntry.timestamp} - ${message}`);
      if (meta) {
        console.warn(JSON.stringify(meta, null, 2));
      }
    } else {
      console.warn(JSON.stringify(logEntry));
      this.writeToFile("warn", logEntry);
    }
  }

  debug(message: string, meta?: any): void {
    if (!this.isDevelopment) return;

    const logEntry = this.formatMessage("DEBUG", message, meta);
    console.log(`[DEBUG] ${logEntry.timestamp} - ${message}`);
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  }

  performance(operation: string, duration: number, meta?: any): void {
    const perfMeta = {
      operation,
      duration_ms: duration,
      ...this.sanitizeForProduction(meta),
    };

    const logEntry = this.formatMessage("PERF", `Operation: ${operation} completed in ${duration}ms`, perfMeta);

    if (this.isDevelopment) {
      console.log(`[PERF] ${logEntry.timestamp} - ${operation}: ${duration}ms`);
      if (meta) {
        console.log(JSON.stringify(meta, null, 2));
      }
    } else {
      console.log(JSON.stringify(logEntry));
      this.writeToFile("performance", logEntry);
    }
  }
}

export const logger = new ProductionLogger();
