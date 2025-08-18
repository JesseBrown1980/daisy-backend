# Daisy - Digital Closet Backend API

A robust Node.js/Express backend API for managing digital wardrobes and automated fashion product scraping from major retailers.

## 🚀 Live Demo

[API Documentation](https://daisy-backend.railway.app/health)

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
- **Deployment**: Railway/Render compatible

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

## 📡 API Documentation

### Closet Items

#### Get Closet Items

```http
GET /api/v1/closet?q=search&sortBy=createdAt
```

**Query Parameters:**

- `q` (optional): Search query for name/brand
- `sortBy` (optional): Sort field (createdAt, name, brand)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid",
      "name": "Blue Denim Jacket",
      "brand": "Levi's",
      "category": "Jackets",
      "imageUrl": "/uploads/image.webp",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Closet items retrieved successfully"
}
```

#### Create Closet Item

```http
POST /api/v1/closet
Content-Type: multipart/form-data
```

**Body:**

- `name` (required): Item name
- `brand` (required): Brand name
- `category` (required): Item category
- `notes` (optional): Additional notes
- `image` (optional): Image file

#### Delete Closet Item

```http
DELETE /api/v1/closet/:id
```

### Product Search

#### Search Products

```http
GET /api/v1/products?query=jacket&page=1&limit=20
```

**Query Parameters:**

- `query` (optional): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "cuid",
        "name": "Wool Blend Coat",
        "brand": "Zara",
        "price": 89.99,
        "currency": "USD",
        "imageUrl": "https://example.com/image.jpg",
        "productUrl": "https://zara.com/product/123",
        "category": "Coats",
        "source": "zara",
        "inStock": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "message": "Products retrieved successfully"
}
```

### Scraping Operations

#### Get Available Brands

```http
GET /api/v1/scrape/brands
```

#### Start Brand Scraping

```http
POST /api/v1/scrape/brand/zara
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Scraping started for zara"
  },
  "message": "Scraping job started"
}
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data
- `npm run scrape` - Run scraping manually
- `npm run lint` - Lint TypeScript code
- `npm run format` - Format code with Prettier

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

## 🚀 Deployment

### Railway (Recommended)

1. **Connect your repository** to Railway
2. **Configure environment variables**
3. **Deploy** - Railway will automatically build and deploy

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

#### Development

- SQLite database for quick setup
- Detailed logging and debugging
- Hot reload with nodemon

#### Production

- PostgreSQL database for scalability
- Optimized logging and error handling
- Process monitoring and health checks

## 🔒 Security Features

- **Helmet**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Request throttling and abuse prevention
- **File Upload**: Secure file handling with type validation
- **Input Validation**: Joi schema validation for all endpoints
- **Error Handling**: Sanitized error responses

## 📊 Performance Optimizations

- **Caching**: In-memory caching for frequently accessed data
- **Database Indexing**: Optimized queries with proper indexes
- **Compression**: Gzip compression for responses

## 📁 Project Structure

```
src/
├── config/             # Application configuration
├── lib/                # Database and external service clients
├── middleware/         # Express middleware functions
├── routes/             # API route definitions
├── services/           # Business logic and data services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
└── validation/         # Request validation schemas
```

## 🔄 Data Flow

1. **Request** → Route Handler → Validation Middleware
2. **Validation** → Service Layer → Database/External APIs
3. **Response** → Error Handling → Client

## 🧩 Key Features Implementation

### Closet Management

- CRUD operations with validation
- Image upload and processing
- Search and filtering capabilities

### Product Scraping

- Configurable scraper architecture
- Scheduled background jobs
- Error handling and retry logic

### Caching Strategy

- In-memory cache for search results
- TTL-based cache invalidation
- Cache warming for popular queries
