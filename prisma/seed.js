"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding database...");
    // Seed some sample closet items
    const closetItems = [
        {
            name: "Classic White Shirt",
            brand: "Uniqlo",
            category: "Tops",
            imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
            color: "White",
            size: "M",
            tags: "casual,work",
        },
        {
            name: "Dark Wash Jeans",
            brand: "Levi's",
            category: "Bottoms",
            imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop",
            color: "Blue",
            size: "32",
            tags: "casual,denim",
        },
        {
            name: "Black Wool Coat",
            brand: "Zara",
            category: "Outerwear",
            imageUrl: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400&h=400&fit=crop",
            color: "Black",
            size: "L",
            tags: "formal,winter",
        },
    ];
    for (const item of closetItems) {
        await prisma.closetItem.create({
            data: item,
        });
    }
    // Seed some sample products (as if crawled from websites)
    const products = [
        {
            name: "Oversized Cotton T-Shirt",
            brand: "Zara",
            price: 29.99,
            currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
            productUrl: "https://zara.com/product/1",
            category: "Tops",
            description: "Comfortable oversized cotton t-shirt",
            inStock: true,
            source: "zara",
        },
        {
            name: "High-Waisted Straight Jeans",
            brand: "H&M",
            price: 49.99,
            currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop",
            productUrl: "https://hm.com/product/2",
            category: "Bottoms",
            description: "Classic high-waisted straight leg jeans",
            inStock: true,
            source: "hm",
        },
        {
            name: "Wool Blend Coat",
            brand: "Uniqlo",
            price: 149.99,
            currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400&h=400&fit=crop",
            productUrl: "https://uniqlo.com/product/3",
            category: "Outerwear",
            description: "Warm wool blend winter coat",
            inStock: false,
            source: "uniqlo",
        },
        {
            name: "Denim Jacket",
            brand: "Zara",
            price: 79.99,
            currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop",
            productUrl: "https://zara.com/product/4",
            category: "Outerwear",
            description: "Classic denim jacket",
            inStock: true,
            source: "zara",
        },
        {
            name: "Knit Sweater",
            brand: "H&M",
            price: 39.99,
            currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
            productUrl: "https://hm.com/product/5",
            category: "Tops",
            description: "Cozy knit sweater",
            inStock: true,
            source: "hm",
        },
    ];
    for (const product of products) {
        await prisma.product.create({
            data: product,
        });
    }
    console.log("✅ Database seeded successfully!");
    console.log(`Created ${closetItems.length} closet items and ${products.length} products`);
}
main()
    .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map