import { NextFunction, Request, Response } from "express";

// Express doesn't automatically forward rejected promises from an async route handler to error
// middleware - this wrapper does that, so every controller can just `async (req, res) => {...}`
// and `throw new AppError(...)` without a try/catch in every single handler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
