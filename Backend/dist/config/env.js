import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.resolve(backendRoot, ".env"), override: false });
const toPort = (value, fallback) => {
    const port = Number(value ?? fallback);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("PORT must be a valid port number");
    }
    return port;
};
const toList = (value) => (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const nodeEnv = process.env.NODE_ENV ?? "development";
const port = toPort(process.env.PORT, 4000);
const appUrl = process.env.APP_URL ?? (nodeEnv === "production" ? "https://quynhdiem.com" : "http://localhost:3000");
const defaultCorsOrigins = nodeEnv === "production"
    ? [appUrl]
    : ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"];
const resolveBackendPath = (value) => path.isAbsolute(value) ? value : path.resolve(backendRoot, value);
export const env = {
    nodeEnv,
    appName: process.env.APP_NAME ?? "Cosmic Love",
    appUrl,
    host: process.env.HOST ?? "0.0.0.0",
    port,
    corsOrigins: toList(process.env.CORS_ORIGIN).length > 0 ? toList(process.env.CORS_ORIGIN) : defaultCorsOrigins,
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? appUrl,
    uploadDir: resolveBackendPath(process.env.UPLOAD_DIR ?? "uploads"),
    mysql: {
        host: process.env.DB_HOST ?? "localhost",
        port: toPort(process.env.DB_PORT, 3306),
        database: process.env.DB_NAME ?? "couple_world",
        user: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? ""
    }
};
