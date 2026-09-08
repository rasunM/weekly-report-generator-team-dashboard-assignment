import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { verifyAccessToken } from "../utils/jwt";

// Augment Express's Request type so `req.user` is typed everywhere it's used, instead of `any`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

// Verifies the access token from the Authorization header and attaches { id, role } to req.user.
// This ONLY proves identity - it does not decide what the request is allowed to do. Role checks live
// in requireRole() below, and ownership checks live in the service layer (see reports.service.ts) so
// they can't be bypassed by hitting a differently-routed endpoint.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
}
