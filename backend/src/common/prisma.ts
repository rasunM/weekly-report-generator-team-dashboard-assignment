import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance (standard Prisma + Node practice - avoids exhausting the
// Postgres connection pool by creating a new client per request/module).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
