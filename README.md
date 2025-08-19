# Daisy - Digital Closet Backend API

A robust Node.js/Express backend API for managing digital wardrobes and automated fashion product scraping from major retailers.

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: Prisma ORM (SQLite for development, PostgreSQL for production)
- **Web Scraping**: Puppeteer + Cheerio
- **File Upload**: Multer with Sharp for image processing
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston with file rotation
- **Scheduling**: Node-cron for background jobs

## 🏗 Architecture Overview

The backend follows a layered architecture pattern with clear separation of concerns:

**Service Layer**: Business logic is encapsulated in service classes (`ClosetService`, `ProductService`, `ScrapingService`) that handle data operations and business rules. This layer is independent of HTTP concerns and can be easily tested.

**Route Layer**: Express routes handle HTTP-specific concerns like request validation, authentication, and response formatting. Routes delegate business logic to services and focus on API contract enforcement.

**Data Layer**: Prisma ORM provides type-safe database access with automatic migrations and query optimization. The schema supports both development (SQLite) and production (PostgreSQL) databases seamlessly.

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (development) or PostgreSQL (production)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/daisy-backend.git
   cd daisy-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Copy the example environment file and configure:

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Database
   DATABASE_URL="file:./prisma/dev.db"

   # Server
   PORT=3000
   NODE_ENV=development

   # CORS
   ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

   # Scraping
   SCRAPING_ENABLED=true
   SCRAPING_INTERVAL_HOURS=24
   ```

4. **Database Setup**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push database schema
   npm run db:push

   # Seed database (optional)
   npm run db:seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 🔄 API Endpoints

### Health Check

```http
GET /health
```

### Closet Management

```http
GET    /api/v1/closet              # Get all closet items
POST   /api/v1/closet              # Create new closet item
DELETE /api/v1/closet/:id          # Delete closet item
```

### Product Discovery

```http
GET  /api/v1/products                    # Search products
POST /api/v1/products/:id/add-to-closet  # Add product to closet
```

### Scraping Management

```http
GET  /api/v1/scrape/brands        # Get available brands
POST /api/v1/scrape/brand/:brand  # Start brand scraping
POST /api/v1/scrape/all           # Start scraping all brands
```

## 🌐 Environment Variables

| Variable                  | Description                | Default                 |
| ------------------------- | -------------------------- | ----------------------- |
| `DATABASE_URL`            | Database connection string | `file:./prisma/dev.db`  |
| `PORT`                    | Server port                | `3000`                  |
| `NODE_ENV`                | Environment mode           | `development`           |
| `ALLOWED_ORIGINS`         | CORS allowed origins       | `http://localhost:5173` |
| `SCRAPING_ENABLED`        | Enable automated scraping  | `true`                  |
| `SCRAPING_INTERVAL_HOURS` | Scraping frequency         | `24`                    |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window          | `900000` (15 min)       |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window    | `100`                   |
| `MAX_FILE_SIZE`           | Max upload file size       | `5242880` (5MB)         |

## 🕷 Web Scraping

The scraping system supports multiple fashion retailers:

### Supported Brands

- **Zara**: Men's and Women's clothing
- More brands can be added by extending the scraper configuration
