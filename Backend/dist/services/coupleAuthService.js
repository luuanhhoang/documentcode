import crypto from "node:crypto";
import { mysqlPool } from "../database/mysqlPool.js";
import { hashPassword, verifyPassword } from "./passwordService.js";
import { sendOtpEmail } from "./emailService.js";
import { createAccessToken } from "./tokenService.js";
const toIso = (value) => {
    if (!value) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};
const normalizeEmail = (email) => email.trim().toLowerCase();
const mapUser = (user) => ({
    id: user.id,
    email: user.email,
    role: "USER",
    status: user.status,
    emailVerifiedAt: null,
    lastLoginAt: toIso(user.last_login_at),
    createdAt: toIso(user.created_at) ?? new Date().toISOString(),
    profile: {
        id: user.id,
        userId: user.id,
        displayName: user.name,
        age: null,
        gender: null,
        hobbies: [],
        mood: null,
        zodiac: null,
        personality: null,
        personalityTraits: [],
        bio: "Một nửa của căn phòng riêng.",
        avatarUrl: user.avatar_url,
        coverUrl: null,
        city: null,
        country: null,
        createdAt: toIso(user.created_at) ?? new Date().toISOString(),
        updatedAt: toIso(user.updated_at) ?? new Date().toISOString()
    }
});
const findUserByEmail = async (email) => {
    const [rows] = await mysqlPool.query("select * from users where email = ? and status <> 'DELETED' limit 1", [normalizeEmail(email)]);
    return rows[0] ?? null;
};
export const getUserWithProfile = async (userId) => {
    const [rows] = await mysqlPool.query("select * from users where id = ? and status <> 'DELETED' limit 1", [userId]);
    const user = rows[0];
    return user ? mapUser(user) : null;
};
export const registerUser = async (displayName, email, password) => {
    const normalizedEmail = normalizeEmail(email);
    if (await findUserByEmail(normalizedEmail)) {
        throw new Error("Email này đã được sử dụng");
    }
    const userId = crypto.randomUUID();
    await mysqlPool.execute(`
      insert into users (id, name, email, password_hash, last_login_at)
      values (?, ?, ?, ?, now())
    `, [userId, displayName.trim(), normalizedEmail, hashPassword(password)]);
    const user = await getUserWithProfile(userId);
    if (!user) {
        throw new Error("Không thể tạo tài khoản");
    }
    return {
        accessToken: createAccessToken(userId),
        needsOnboarding: false,
        user
    };
};
export const loginUser = async (email, password) => {
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
        throw new Error("Email hoặc mật khẩu không đúng");
    }
    if (user.status !== "ACTIVE") {
        throw new Error("Tài khoản hiện không khả dụng");
    }
    await mysqlPool.execute("update users set last_login_at = now() where id = ?", [user.id]);
    const updated = await getUserWithProfile(user.id);
    if (!updated) {
        throw new Error("Không tìm thấy tài khoản");
    }
    return {
        accessToken: createAccessToken(user.id),
        needsOnboarding: false,
        user: updated
    };
};
export const markOnboardingDone = async (_userId) => {
    return;
};
export const createPasswordReset = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
        return undefined;
    }
    const otp = String(crypto.randomInt(100000, 999999));
    await mysqlPool.execute(`
      insert into password_resets (email, otp, expires_at)
      values (?, ?, date_add(now(), interval 15 minute))
      on duplicate key update
        otp = values(otp),
        expires_at = values(expires_at),
        created_at = now()
    `, [normalizedEmail, otp]);
    // Gửi mã thật về email nếu đã cấu hình SMTP; chưa cấu hình thì trả otp để dev hiển thị tạm
    const emailed = await sendOtpEmail(normalizedEmail, otp);
    return { otp, emailed };
};
// Kiểm tra mã OTP còn hiệu lực (bước "nhập mã" trước khi cho đặt mật khẩu mới)
export const verifyResetOtp = async (email, otp) => {
    const normalizedEmail = normalizeEmail(email);
    const [rows] = await mysqlPool.query("select otp from password_resets where email = ? and expires_at > now() limit 1", [normalizedEmail]);
    if (rows[0]?.otp !== otp.trim()) {
        throw new Error("Mã OTP không đúng hoặc đã hết hạn");
    }
    return true;
};
export const resetPassword = async (email, otp, password) => {
    const normalizedEmail = normalizeEmail(email);
    const [rows] = await mysqlPool.query("select otp from password_resets where email = ? and expires_at > now() limit 1", [normalizedEmail]);
    if (rows[0]?.otp !== otp.trim()) {
        throw new Error("OTP không hợp lệ hoặc đã hết hạn");
    }
    const [updated] = await mysqlPool.execute("update users set password_hash = ? where email = ? and status <> 'DELETED'", [hashPassword(password), normalizedEmail]);
    if (updated.affectedRows === 0) {
        throw new Error("Tài khoản không tồn tại");
    }
    await mysqlPool.execute("delete from password_resets where email = ?", [normalizedEmail]);
};
