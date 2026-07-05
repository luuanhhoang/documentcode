import multer from "multer";
import { env } from "../config/env.js";
export const errorHandler = (error, _req, res, _next) => {
    console.error(error);
    if (error instanceof multer.MulterError) {
        res.status(400).json({
            success: false,
            message: error.code === "LIMIT_FILE_SIZE" ? "Ảnh vượt quá dung lượng cho phép" : "File tải lên không hợp lệ",
            data: null
        });
        return;
    }
    if (error instanceof Error && error.message.includes("Chỉ hỗ trợ ảnh")) {
        res.status(400).json({ success: false, message: error.message, data: null });
        return;
    }
    res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra, vui lòng thử lại sau",
        detail: env.nodeEnv === "development" && error instanceof Error
            ? error.message
            : undefined
    });
};
