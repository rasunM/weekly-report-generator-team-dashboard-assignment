import { Router } from "express";
import { validate } from "../../common/middleware/validate.middleware";
import { registerSchema, loginSchema, refreshSchema } from "./auth.dto";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", validate({ body: registerSchema }), authController.register);
router.post("/login", validate({ body: loginSchema }), authController.login);
router.post("/refresh", validate({ body: refreshSchema }), authController.refresh);
router.post("/logout", validate({ body: refreshSchema }), authController.logout);

export default router;
