import crypto from "node:crypto";

// PBKDF2 + SHA-512 với số vòng lặp cố định cho hash mật khẩu.
const iterations = 100_000;
const keyLength = 64;
const digest = "sha512";

// Format lưu DB: pbkdf2:iterations:salt:hash để vẫn verify được hash cũ khi tăng số vòng lặp.
export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");

  return `pbkdf2:${iterations}:${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [method, iterationText, salt, hash] = storedHash.split(":");

  // Hash sai định dạng hoặc thuộc cơ chế khác sẽ bị từ chối.
  if (method !== "pbkdf2" || !iterationText || !salt || !hash) {
    return false;
  }

  const computed = crypto
    .pbkdf2Sync(password, salt, Number(iterationText), keyLength, digest)
    .toString("hex");

  // So sánh constant-time để giảm rủi ro timing attack.
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
};
