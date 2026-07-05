import type { RequestHandler } from "express";
import { fail } from "../utils/apiResponse.js";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// đếm trong RAM, restart server là reset hết — đủ cho 1 process; scale lên nhiều node thì phải đẩy sang Redis
const buckets = new Map<string, RateLimitEntry>();

type RateLimitOptions = {
  keyPrefix: string;
  max: number;
  windowMs: number;
};

const cleanupExpiredBuckets = () => {
  const now = Date.now();

  // tiện thể dọn các bucket cũ luôn cho đỡ phình map
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export const rateLimit = ({ keyPrefix, max, windowMs }: RateLimitOptions): RequestHandler => {
  return (req, res, next) => {
    cleanupExpiredBuckets();

    // key theo IP, prefix để mỗi route có quota riêng (login, password, ...)
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const current = buckets.get(key);

    // hết window cũ hoặc lần đầu vào -> mở bucket mới
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      fail(res, 429, "Bạn thao tác quá nhanh, vui lòng thử lại sau");
      return;
    }

    next();
  };
};
