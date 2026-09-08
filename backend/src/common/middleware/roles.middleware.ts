import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../errors/AppError";

// `@Roles('MANAGER')`-equivalent for Express: a factory that returns middleware checking the
// role attached by requireAuth(). Always place requireAuth() before this in the route's middleware
// chain. Per the assignment's RBAC requirement, this handles the ROLE check; per-resource OWNERSHIP
// checks (e.g. "is this report actually yours") are done in the service layer, not here - a route
// guard alone can't know about ownership without a DB lookup, and duplicating that logic per-route
// invites the exact bypass the assignment calls out ("must never be able to access another team
// member's report data").
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!allowed.includes(req.user.role)) {
      throw AppError.forbidden(`This action requires role: ${allowed.join(" or ")}`);
    }
    next();
  };
}
