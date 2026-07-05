import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { apiRoutes } from "./routes/index.js";

const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
const devTunnelHostSuffixes = [".ngrok-free.app", ".ngrok.app"];

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  if (env.corsOrigins.includes(origin)) {
    return true;
  }

  if (env.nodeEnv === "production") {
    return false;
  }

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return localHostnames.has(hostname) || devTunnelHostSuffixes.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      }
    })
  );
  app.use(express.json({ limit: "8mb" }));

  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
