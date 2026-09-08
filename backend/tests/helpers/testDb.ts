import { prisma } from "../../src/common/prisma";

// Truncates every app table and restarts identity sequences, run once before the suite so each test
// file starts from a known-empty database. TRUNCATE ... CASCADE sidesteps having to know FK
// dependency order by hand (unlike the seed script's deleteMany() cleanup, which documents that
// order intentionally as a teaching example - here we just want speed and simplicity for tests).
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "review_comments",
      "hours_entries",
      "task_entries",
      "report_versions",
      "reports",
      "project_assignments",
      "refresh_tokens",
      "projects",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}
