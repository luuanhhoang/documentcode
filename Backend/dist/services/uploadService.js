import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
const imageMimeToExtension = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"]
]);
export const avatarUploadDir = path.join(env.uploadDir, "avatars");
export const coupleAvatarUploadDir = path.join(env.uploadDir, "couple-avatars");
const makeStorage = (directory) => multer.diskStorage({
    destination: (_req, _file, callback) => {
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
    },
    filename: (_req, file, callback) => {
        const extension = imageMimeToExtension.get(file.mimetype) ?? "jpg";
        callback(null, `${crypto.randomUUID()}.${extension}`);
    }
});
const imageFilter = (_req, file, callback) => {
    if (!imageMimeToExtension.has(file.mimetype)) {
        callback(new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP"));
        return;
    }
    callback(null, true);
};
export const avatarUpload = multer({
    storage: makeStorage(avatarUploadDir),
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});
export const coupleAvatarUpload = multer({
    storage: makeStorage(coupleAvatarUploadDir),
    fileFilter: imageFilter,
    limits: { fileSize: 3 * 1024 * 1024 }
});
export const avatarPublicPath = (fileName) => `/api/media/avatars/${fileName}`;
export const coupleAvatarPublicPath = (fileName) => `/api/media/couple-avatars/${fileName}`;
export const avatarFilePath = (fileName) => path.join(avatarUploadDir, fileName);
export const coupleAvatarFilePath = (fileName) => path.join(coupleAvatarUploadDir, fileName);
