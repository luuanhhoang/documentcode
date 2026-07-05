import type { Response } from "express";

export const ok = <T>(res: Response, message: string, data: T) => {
  res.json({
    success: true,
    message,
    data
  });
};

export const fail = (res: Response, status: number, message: string, data: unknown = null) => {
  res.status(status).json({
    success: false,
    message,
    data
  });
};
