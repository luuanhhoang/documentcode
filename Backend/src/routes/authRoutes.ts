import { Router } from "express";
import {
  completeOnboarding,
  forgotPassword,
  login,
  logout,
  markOffline,
  me,
  refreshSession,
  register,
  resetPasswordController,
  verifyOtpController
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

export const authRoutes = Router();

const authLimiter = rateLimit({ keyPrefix: "auth", max: 20, windowMs: 15 * 60 * 1000 });
const passwordLimiter = rateLimit({ keyPrefix: "password", max: 8, windowMs: 15 * 60 * 1000 });

authRoutes.post("/auth/register", authLimiter, register);
authRoutes.post("/auth/login", authLimiter, login);
authRoutes.get("/auth/me", requireAuth, me);
authRoutes.post("/auth/complete-onboarding", requireAuth, completeOnboarding);
authRoutes.post("/auth/logout", logout);
authRoutes.post("/auth/presence/offline", markOffline);
authRoutes.post("/auth/refresh-token", requireAuth, refreshSession);
authRoutes.post("/auth/forgot-password", passwordLimiter, forgotPassword);
authRoutes.post("/auth/verify-otp", passwordLimiter, verifyOtpController);
authRoutes.post("/auth/reset-password", passwordLimiter, resetPasswordController);
