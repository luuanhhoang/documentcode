import { createPasswordReset, getUserWithProfile, loginUser, markOnboardingDone, registerUser, resetPassword, verifyResetOtp } from "../services/coupleAuthService.js";
import { env } from "../config/env.js";
import { mysqlPool } from "../database/mysqlPool.js";
import { clearAuthCookie, createAccessToken, createAuthCookie, getAccessTokenFromCookieHeader, verifyAccessToken } from "../services/tokenService.js";
import { fail, ok } from "../utils/apiResponse.js";
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
// dùng cho mấy route không bật requireAuth (logout, presence) — cố lấy userId từ header/cookie nếu có
const getRequestUserId = (req) => {
    if (req.userId) {
        return req.userId;
    }
    const header = req.header("authorization");
    const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    const cookieToken = getAccessTokenFromCookieHeader(req.header("cookie"));
    const payload = verifyAccessToken(bearerToken ?? cookieToken ?? "");
    return payload?.sub ?? null;
};
export const register = async (req, res, next) => {
    try {
        const { displayName, email, password, confirmPassword } = req.body;
        // validate sơ trước khi đụng tới DB cho đỡ tốn round-trip
        if (!displayName?.trim()) {
            fail(res, 400, "Vui lòng nhập tên hiển thị");
            return;
        }
        if (!email?.trim() || !isEmail(email)) {
            fail(res, 400, "Email không hợp lệ");
            return;
        }
        if (!password || password.length < 6 || password !== confirmPassword) {
            fail(res, 400, "Mật khẩu cần ít nhất 6 ký tự và khớp xác nhận");
            return;
        }
        const session = await registerUser(displayName, email, password);
        res.setHeader("Set-Cookie", createAuthCookie(session.accessToken));
        ok(res, "Đăng ký thành công", session);
    }
    catch (error) {
        if (error instanceof Error) {
            fail(res, 400, error.message);
            return;
        }
        next(error);
    }
};
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email?.trim() || !password) {
            fail(res, 400, "Vui lòng nhập email và mật khẩu");
            return;
        }
        const session = await loginUser(email, password);
        res.setHeader("Set-Cookie", createAuthCookie(session.accessToken));
        ok(res, "Đăng nhập thành công", session);
    }
    catch (error) {
        if (error instanceof Error) {
            fail(res, 401, error.message);
            return;
        }
        next(error);
    }
};
export const me = async (req, res) => {
    const user = req.userId ? await getUserWithProfile(req.userId) : null;
    if (!user) {
        fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
        return;
    }
    ok(res, "Thông tin tài khoản", { user });
};
export const refreshSession = async (req, res) => {
    const user = req.userId ? await getUserWithProfile(req.userId) : null;
    if (!user || !req.userId) {
        fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
        return;
    }
    const accessToken = createAccessToken(req.userId);
    res.setHeader("Set-Cookie", createAuthCookie(accessToken));
    ok(res, "Đã làm mới phiên", {
        accessToken,
        needsOnboarding: false,
        user
    });
};
export const completeOnboarding = async (req, res) => {
    if (!req.userId) {
        fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
        return;
    }
    await markOnboardingDone(req.userId);
    ok(res, "Đã hoàn tất hướng dẫn", { completed: true });
};
export const logout = async (req, res) => {
    const userId = getRequestUserId(req);
    if (userId) {
        await mysqlPool.execute("update users set last_seen_at = null where id = ?", [userId]);
    }
    res.setHeader("Set-Cookie", clearAuthCookie());
    ok(res, "Đã đăng xuất", { loggedOut: true });
};
export const markOffline = async (req, res) => {
    const userId = getRequestUserId(req);
    if (userId) {
        await mysqlPool.execute("update users set last_seen_at = null where id = ?", [userId]);
    }
    ok(res, "Đã cập nhật trạng thái", { offline: true });
};
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email?.trim() || !isEmail(email)) {
            fail(res, 400, "Email không hợp lệ");
            return;
        }
        const result = await createPasswordReset(email);
        ok(res, result?.emailed ? "Đã gửi mã xác nhận về email của bạn" : "Đã tạo mã xác nhận", {
            sent: true,
            emailed: result?.emailed ?? false,
            devOtp: env.nodeEnv === "development" ? result?.otp : undefined
        });
    }
    catch (error) {
        next(error);
    }
};
export const verifyOtpController = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email?.trim() || !otp?.trim()) {
            fail(res, 400, "Vui lòng nhập email và mã xác nhận");
            return;
        }
        await verifyResetOtp(email, otp);
        ok(res, "Mã hợp lệ", { valid: true });
    }
    catch (error) {
        if (error instanceof Error) {
            fail(res, 400, error.message);
            return;
        }
        next(error);
    }
};
export const resetPasswordController = async (req, res, next) => {
    try {
        const { email, otp, password, confirmPassword } = req.body;
        if (!email?.trim() ||
            !otp?.trim() ||
            !password ||
            password.length < 6 ||
            password !== confirmPassword) {
            fail(res, 400, "Thông tin đặt lại mật khẩu không hợp lệ");
            return;
        }
        await resetPassword(email, otp, password);
        res.setHeader("Set-Cookie", clearAuthCookie());
        ok(res, "Đặt lại mật khẩu thành công", { reset: true });
    }
    catch (error) {
        if (error instanceof Error) {
            fail(res, 400, error.message);
            return;
        }
        next(error);
    }
};
