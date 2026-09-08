import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

// Single place every error in the app flows through (thrown in a controller/service, or forwarded
// via asyncHandler's .catch(next)). Keeps error shape consistent and keeps "what does a Postgres
// unique-constraint violation mean to the client" logic out of every service.
// Must be registered LAST, after all routes, per Express's error-middleware convention (4 args).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "A record with these values already exists." },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Record not found." },
      });
    }
    if (err.code === "P2003") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "This record can't be deleted because other records still reference it (e.g. review comments they authored).",
        },
      });
    }
  }

  // Anything else is unexpected - log it fully server-side but never leak internals to the client.
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  });
}

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route: ${req.method} ${req.path}` } });
}
