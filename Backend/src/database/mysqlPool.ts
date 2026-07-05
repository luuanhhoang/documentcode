import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export const mysqlPool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  database: env.mysql.database,
  user: env.mysql.user,
  password: env.mysql.password,
  charset: "utf8mb4",
  connectionLimit: 10,
  namedPlaceholders: true,
  waitForConnections: true
});
// connect database + truy vấn thử để phát hiện lỗi ngay khi app khởi động, không phải đợi user report mới biết
export const closeMysqlPool = () => mysqlPool.end();
