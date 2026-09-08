import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./common/middleware/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import projectsRoutes from "./modules/projects/projects.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import reviewRoutes from "./modules/review/review.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

// Builds the Express app WITHOUT calling .listen() - this is what tests/setup.ts imports directly
// with Supertest (no real network port needed for tests), and server.ts imports it to actually run
// the app. Keeping these separate is what makes the RBAC test suite fast and self-contained.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/review", reviewRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
