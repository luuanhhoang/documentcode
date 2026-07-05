import { mysqlPool } from "../database/mysqlPool.js";
import { getCurrentCoupleRoom } from "../middlewares/coupleRoom.js";
const toIso = (value) => {
    if (!value)
        return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};
const toDateOnly = (value) => {
    if (!value)
        return null;
    return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};
const trimOrNull = (value) => {
    if (typeof value !== "string")
        return null;
    const text = value.trim();
    return text ? text : null;
};
const mapProfile = async (row) => ({
    id: row.id,
    email: row.email,
    displayName: row.name,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    birthday: toDateOnly(row.birthday),
    gender: row.gender,
    bio: row.bio,
    interests: row.interests ? row.interests.split(",").map((item) => item.trim()).filter(Boolean) : [],
    defaultMood: row.default_mood,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    couple: await getCurrentCoupleRoom(row.id)
});
export const getMyProfile = async (userId) => {
    const [rows] = await mysqlPool.query("select * from users where id = ? and status = 'ACTIVE' limit 1", [userId]);
    const user = rows[0];
    if (!user)
        throw new Error("Không tìm thấy hồ sơ");
    return mapProfile(user);
};
export const updateMyProfile = async (userId, input) => {
    const interests = Array.isArray(input.interests)
        ? input.interests.map((item) => String(item).trim()).filter(Boolean).join(", ")
        : trimOrNull(input.interests);
    await mysqlPool.execute(`
      update users set
        name = coalesce(?, name),
        nickname = ?,
        birthday = ?,
        gender = ?,
        bio = ?,
        interests = ?,
        default_mood = ?
      where id = ? and status = 'ACTIVE'
    `, [trimOrNull(input.displayName), trimOrNull(input.nickname), trimOrNull(input.birthday), trimOrNull(input.gender), trimOrNull(input.bio), interests, trimOrNull(input.defaultMood), userId]);
    return getMyProfile(userId);
};
export const updateMyAvatar = async (userId, avatarUrl) => {
    await mysqlPool.execute("update users set avatar_url = ? where id = ? and status = 'ACTIVE'", [avatarUrl, userId]);
    return getMyProfile(userId);
};
