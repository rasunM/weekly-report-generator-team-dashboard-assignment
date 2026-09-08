import dotenv from "dotenv";

dotenv.config();

// Point every module that reads DATABASE_URL (src/config/env.ts, prisma) at the TEST database
// instead of your dev one, BEFORE anything else in the app gets imported. This must happen here,
// not in a beforeAll, because Prisma reads env.DATABASE_URL once at module-load time.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Copy .env.example to .env and make sure TEST_DATABASE_URL points at a separate database from DATABASE_URL."
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
