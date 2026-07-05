import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
const allowedImageTypes = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"]
]);
const maxImageBytes = 5 * 1024 * 1024;
const coupleImageDir = path.join(env.uploadDir, "couple-images");
export const coupleImagePublicPath = (fileName) => `/api/media/couple-images/${fileName}`;
export const coupleImageFilePath = (fileName) => path.join(coupleImageDir, fileName);
export function extractCoupleImageFileName(url) {
    const match = url.match(/^\/api\/media\/couple-images\/([a-f0-9-]+\.(?:jpg|png|webp|gif))$/i);
    return match?.[1] ?? null;
}
export async function saveCoupleImage(userId, imageData) {
    if (typeof imageData !== "string" || !imageData.trim()) {
        return null;
    }
    const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) {
        throw new Error("Ảnh tải lên không hợp lệ");
    }
    const mimeType = match[1].toLowerCase();
    const extension = allowedImageTypes.get(mimeType);
    if (!extension) {
        throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
    }
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length === 0 || buffer.length > maxImageBytes) {
        throw new Error("Ảnh tối đa 5MB");
    }
    await mkdir(coupleImageDir, { recursive: true });
    const safeUser = userId.replace(/[^a-zA-Z0-9-]/g, "");
    const fileName = `${safeUser}-${crypto.randomUUID()}.${extension}`;
    await writeFile(path.join(coupleImageDir, fileName), buffer, { flag: "wx" });
    return coupleImagePublicPath(fileName);
}
