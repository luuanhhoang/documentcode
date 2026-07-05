import type { RequestHandler } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { mysqlPool } from "../database/mysqlPool.js";
import { fail } from "../utils/apiResponse.js";

export type CoupleRoomContext = {
  id: string;
  roomName: string;
  inviteCode: string;
  ownerUserId: string;
  anniversaryDate: string | null;
  coupleAvatarUrl: string | null;
  roomBio: string | null;
  theme: string;
  status: "waiting" | "paired";
  role: "owner" | "partner";
  nickname: string | null;
  memberCount: number;
};

type RoomRow = RowDataPacket & {
  id: string;
  room_name: string;
  invite_code: string;
  owner_user_id: string;
  anniversary_date: Date | string | null;
  couple_avatar_url: string | null;
  room_bio: string | null;
  theme: string;
  status: "waiting" | "paired";
  role: "owner" | "partner";
  nickname: string | null;
  member_count: number;
};

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

const toDateOnly = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
};

export const getCurrentUser = async (userId: string) => {
  const [rows] = await mysqlPool.query<Array<RowDataPacket & { id: string; email: string; name: string }>>(
    "select id, email, name from users where id = ? and status = 'ACTIVE' limit 1",
    [userId]
  );

  return rows[0] ?? null;
};

export const getCurrentCoupleRoom = async (userId: string): Promise<CoupleRoomContext | null> => {
  const [rows] = await mysqlPool.query<RoomRow[]>(
    `
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
    `,
    [userId]
  );
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

declare module "express-serve-static-core" {
  interface Request {
    coupleRoom?: CoupleRoomContext;
  }
}

export const ensureRoomMember: RequestHandler = async (req, res, next) => {
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

export const ensureResourceBelongsToRoom = async (
  table: string,
  id: string,
  coupleRoomId: string
) => {
  if (!privateTables.has(table)) {
    throw new Error("Bảng không được phép kiểm tra quyền");
  }

  const [rows] = await mysqlPool.query<Array<RowDataPacket & { id: string }>>(
    `select id from ${table} where id = ? and couple_room_id = ? limit 1`,
    [id, coupleRoomId]
  );

  return Boolean(rows[0]);
};
