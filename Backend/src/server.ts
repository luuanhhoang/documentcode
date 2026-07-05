import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { validateCoupleSchemaReady } from "./database/coupleSchemaCheck.js";
import { closeMysqlPool } from "./database/mysqlPool.js";

try {
  await validateCoupleSchemaReady();
} catch (error) {
  console.error("[database] MySQL schema is not ready.");
  console.error("[database] Import database/couple_world.sql before starting the backend.");
  console.error(error);
  await closeMysqlPool();
  process.exit(1);
}

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  const displayHost = env.host === "0.0.0.0" ? "localhost" : env.host;
  console.log(`Backend running on http://${displayHost}:${env.port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await closeMysqlPool();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
