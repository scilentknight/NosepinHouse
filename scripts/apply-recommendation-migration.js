const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to database...");
    const sql = fs.readFileSync(
      path.join(__dirname, "../prisma/migrations/20261124000000_add_product_interaction/migration.sql"),
      "utf8"
    );
    
    // Split and execute statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      console.log("Executing statement:\n", statement);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log("ProductInteraction table created successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
