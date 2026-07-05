import { mysqlPool } from "../database/mysqlPool.js";
import { fail } from "../utils/apiResponse.js";
const privateTables = new Set([
    "memories",
    "private_letters",
    "bucket_items",
    "wallet_entries",
    "challenges",
    "couple_tasks",
    "calendar_events",
    "songs",
    "daily_answers",
    "moods",
    "albums",
    "album_photos",
    "notifications"
]);
const toDateOnly = (value) => {
    if (!value) {
        return null;
    }
    if (typeof value === "string") {
        return value.slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
};
export const getCurrentUser = async (userId) => {
    const [rows] = await mysqlPool.query("select id, email, name from users where id = ? and status = 'ACTIVE' limit 1", [userId]);
    return rows[0] ?? null;
};
export const getCurrentCoupleRoom = async (userId) => {
    const [rows] = await mysqlPool.query(`
      select
        cr.id,
        cr.room_name,
        cr.invite_code,
        cr.owner_user_id,
        cr.anniversary_date,
        cr.couple_avatar_url,
        cr.room_bio,
        cr.theme,
        cr.status,
        cm.role,
        cm.nickname,
        (
          select count(*)
          from couple_members cm_count
          where cm_count.couple_room_id = cr.id
        ) as member_count
      from couple_members cm
      join couple_rooms cr on cr.id = cm.couple_room_id
      where cm.user_id = ?
      limit 1
    `, [userId]);
    const room = rows[0];
    if (!room) {
        return null;
    }
    return {
        id: room.id,
        roomName: room.room_name,
        inviteCode: room.invite_code,
        ownerUserId: room.owner_user_id,
        anniversaryDate: toDateOnly(room.anniversary_date),
        coupleAvatarUrl: room.couple_avatar_url,
        roomBio: room.room_bio,
        theme: room.theme ?? "violet",
        status: room.status,
        role: room.role,
        nickname: room.nickname,
        memberCount: Number(room.member_count)
    };
};
export const ensureRoomMember = async (req, res, next) => {
    if (!req.userId) {
        fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
        return;
    }
    const room = await getCurrentCoupleRoom(req.userId);
    if (!room) {
        fail(res, 428, "Bạn cần tạo hoặc tham gia phòng riêng trước");
        return;
    }
    req.coupleRoom = room;
    next();
};
export const ensureResourceBelongsToRoom = async (table, id, coupleRoomId) => {
    if (!privateTables.has(table)) {
        throw new Error("Bảng không được phép kiểm tra quyền");
    }
    const [rows] = await mysqlPool.query(`select id from ${table} where id = ? and couple_room_id = ? limit 1`, [id, coupleRoomId]);
    return Boolean(rows[0]);
};
