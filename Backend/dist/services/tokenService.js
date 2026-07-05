import crypto from "node:crypto";
const configuredSecret = process.env.AUTH_SECRET ?? process.env.JWT_SECRET;
const placeholderSecretPattern = /^(change|replace|your-|example|dev-|local-)/i;
if (process.env.NODE_ENV === "production" &&
    (!configuredSecret || configuredSecret.length < 32 || placeholderSecretPattern.test(configuredSecret))) {
    throw new Error("AUTH_SECRET or JWT_SECRET must be set to a strong non-placeholder value in production");
}
const secret = configuredSecret ?? "local-only-us-secret";
const tokenTtlSeconds = 60 * 60 * 24 * 7;
export const authCookieName = "only_us_access_token";
export const authCookieMaxAgeSeconds = tokenTtlSeconds;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (value) => crypto.createHmac("sha256", secret).update(value).digest("base64url");
// tự ký JWT bằng HMAC-SHA256, đỡ phải kéo lib ngoài
export const createAccessToken = (userId) => {
    const payload = {
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + tokenTtlSeconds
    };
    const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}`;
    return `${body}.${sign(body)}`;
};
export const verifyAccessToken = (token) => {
    const [header, payload, signature] = token.split(".");
    const body = `${header}.${payload}`;
    if (!header || !payload || !signature || sign(body) !== signature) {
        return null;
    }
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!data.sub || data.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return data;
    }
    catch {
        return null;
    }
};
const cookieSameSite = () => {
    const configured = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();
    if (configured === "none" || configured === "strict" || configured === "lax") {
        return configured;
    }
    return "lax";
};
const shouldUseSecureCookie = () => process.env.AUTH_COOKIE_SECURE === "true" ||
    (process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");
const serializeAuthCookie = (value, maxAgeSeconds) => {
    const parts = [
        `${authCookieName}=${value}`,
        "Path=/api",
        `Max-Age=${maxAgeSeconds}`,
        "HttpOnly",
        `SameSite=${cookieSameSite()}`
    ];
    if (shouldUseSecureCookie()) {
        parts.push("Secure");
    }
    return parts.join("; ");
};
export const createAuthCookie = (token) => serializeAuthCookie(encodeURIComponent(token), authCookieMaxAgeSeconds);
export const clearAuthCookie = () => serializeAuthCookie("", 0);
export const getAccessTokenFromCookieHeader = (cookieHeader) => {
    if (!cookieHeader) {
        return null;
    }
    const cookies = cookieHeader.split(";").map((item) => item.trim());
    const cookie = cookies.find((item) => item.startsWith(`${authCookieName}=`));
    if (!cookie) {
        return null;
    }
    return decodeURIComponent(cookie.slice(authCookieName.length + 1));
};
