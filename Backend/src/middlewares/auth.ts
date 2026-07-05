import type { RequestHandler } from "express";
import { mysqlPool } from "../database/mysqlPool.js";
import { getAccessTokenFromCookieHeader, verifyAccessToken } from "../services/tokenService.js";
import { fail } from "../utils/apiResponse.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  // Ưu tiên Authorization header, fallback sang cookie HttpOnly nếu frontend không kèm header.
  const header = req.header("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const cookieToken = getAccessTokenFromCookieHeader(req.header("cookie"));
  const token = bearerToken ?? cookieToken;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) {
    fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
    return;
  }

  req.userId = payload.sub;
  void mysqlPool
    .execute("update users set last_seen_at = current_timestamp where id = ?", [payload.sub])
    .catch(() => undefined);
  next();
};
