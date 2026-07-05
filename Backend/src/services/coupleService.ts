import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { mysqlPool } from "../database/mysqlPool.js";
import { getCurrentCoupleRoom, ensureResourceBelongsToRoom } from "../middlewares/coupleRoom.js";
import { saveCoupleImage } from "./coupleUploadService.js";

type UserMiniRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  last_seen_at?: Date | string | null;
};

type MemberRow = UserMiniRow & {
  role: "owner" | "partner";
  nickname: string | null;
  joined_at: Date | string;
};

type MemoryRow = RowDataPacket & {
  id: string;
  couple_room_id: string;
  created_by: string;
  title: string;
  content: string | null;
  memory_date: Date | string;
  image_url: string | null;
  place_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
  creator_avatar_url?: string | null;
};

type LetterRow = RowDataPacket & {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  title: string;
  content: string;
  mood: string | null;
  unlock_at: Date | string | null;
  is_secret: 0 | 1;
  pinned: 0 | 1;
  envelope: string | null;
  paper: string | null;
  font: string | null;
  opened_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  sender_name?: string;
  receiver_name?: string | null;
};

type TaskRow = RowDataPacket & {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "todo" | "doing" | "done";
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
};

type CalendarEventRow = RowDataPacket & {
  id: string;
  created_by: string;
  title: string;
  event_type: "date" | "camping" | "picnic" | "movie" | "dinner" | "travel" | "birthday" | "anniversary" | "other";
  description: string | null;
  starts_at: Date | string;
  reminder_sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
};

type SongRow = RowDataPacket & {
  id: string;
  added_by: string;
  title: string;
  artist: string | null;
  cover_url: string | null;
  source_type: "soundcloud" | "youtube" | "spotify" | "custom";
  source_url: string;
  message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  added_by_name?: string;
};

type QuestionRow = RowDataPacket & {
  id: string;
  question: string;
  category: string | null;
};

type AnswerRow = RowDataPacket & {
  id: string;
  question_id: string;
  user_id: string;
  answer: string;
  answer_date: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  user_name?: string;
  avatar_url?: string | null;
};

type RoomQuizRow = RowDataPacket & {
  id: string;
  couple_room_id: string;
  created_by: string;
  question: string;
  quiz_type: "open" | "choice";
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
  creator_avatar_url?: string | null;
};

type RoomQuizAnswerRow = RowDataPacket & {
  id: string;
  quiz_id: string;
  user_id: string;
  answer: string;
  created_at: Date | string;
  updated_at: Date | string;
  user_name?: string;
  avatar_url?: string | null;
};

type QuizOptionKey = "A" | "B" | "C" | "D";

type QuizGameRow = RowDataPacket & {
  id: string;
  couple_room_id: string;
  created_by: string;
  title: string;
  meaning: string | null;
  time_limit_seconds: number;
  status: "active" | "archived";
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
  creator_avatar_url?: string | null;
};

type QuizGameQuestionRow = RowDataPacket & {
  id: string;
  couple_room_id: string;
  game_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: QuizOptionKey;
  sort_order: number;
  created_at: Date | string;
};

type QuizAttemptRow = RowDataPacket & {
  id: string;
  couple_room_id: string;
  game_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  duration_seconds: number;
  started_at: Date | string;
  completed_at: Date | string;
  user_name?: string;
  avatar_url?: string | null;
};

type MoodRow = RowDataPacket & {
  id: string;
  user_id: string;
  mood: string;
  note: string | null;
  mood_date: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  user_name?: string;
  avatar_url?: string | null;
};

type AlbumRow = RowDataPacket & {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  creator_name?: string;
};

type PhotoRow = RowDataPacket & {
  id: string;
  album_id: string;
  uploaded_by: string;
  image_url: string;
  caption: string | null;
  created_at: Date | string;
  uploader_name?: string;
};

type NotificationRow = RowDataPacket & {
  id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: 0 | 1;
  created_at: Date | string;
};

type CountRow = RowDataPacket & { count: number };

const uuid = () => crypto.randomUUID();

const toIso = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const toDateOnly = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);
const onlineWindowMs = 45 * 1000;

const trimOrNull = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const requireText = (value: unknown, message: string, max = 180) => {
  const text = trimOrNull(value);

  if (!text) {
    throw new Error(message);
  }

  return text.slice(0, max);
};

const isRecentlySeen = (value: Date | string | null | undefined) => {
  if (!value) {
    return false;
  }

  const seenAt = new Date(value).getTime();

  return Number.isFinite(seenAt) && Date.now() - seenAt <= onlineWindowMs;
};

const resolveImageUrl = async (userId: string, input: Record<string, unknown>) => {
  const uploadedUrl = await saveCoupleImage(userId, input.imageData);

  return uploadedUrl ?? trimOrNull(input.imageUrl);
};

const isYouTubeUrl = (value: string) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value.trim());

const normalizeInviteCode = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();

const createInviteCode = () => crypto.randomBytes(5).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

const mapMember = (row: MemberRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  avatarUrl: row.avatar_url,
  role: row.role,
  nickname: row.nickname,
  joinedAt: toIso(row.joined_at),
  lastSeenAt: toIso(row.last_seen_at),
  isOnline: isRecentlySeen(row.last_seen_at)
});

const mapMemory = (row: MemoryRow) => ({
  id: row.id,
  createdBy: row.created_by,
  title: row.title,
  content: row.content,
  memoryDate: toDateOnly(row.memory_date),
  imageUrl: row.image_url,
  placeName: row.place_name,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  creator: row.creator_name
    ? {
        name: row.creator_name,
        avatarUrl: row.creator_avatar_url ?? null
      }
    : null
});

const mapLetter = (row: LetterRow) => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  title: row.title,
  content: row.content,
  mood: row.mood,
  unlockAt: toIso(row.unlock_at),
  isSecret: Boolean(row.is_secret),
  pinned: Boolean(row.pinned),
  envelope: row.envelope ?? null,
  paper: row.paper ?? null,
  font: row.font ?? null,
  openedAt: toIso(row.opened_at),
  isOpened: Boolean(row.opened_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  senderName: row.sender_name ?? null,
  receiverName: row.receiver_name ?? null
});

const mapTask = (row: TaskRow) => ({
  id: row.id,
  createdBy: row.created_by,
  title: row.title,
  description: row.description,
  category: row.category,
  status: row.status,
  completedAt: toIso(row.completed_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  creatorName: row.creator_name ?? null
});

const mapCalendarEvent = (row: CalendarEventRow) => ({
  id: row.id,
  createdBy: row.created_by,
  title: row.title,
  eventType: row.event_type,
  description: row.description,
  startsAt: toIso(row.starts_at),
  reminderSentAt: toIso(row.reminder_sent_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  creatorName: row.creator_name ?? null
});

const mapSong = (row: SongRow) => ({
  id: row.id,
  addedBy: row.added_by,
  title: row.title,
  artist: row.artist,
  coverUrl: row.cover_url,
  sourceType: row.source_type,
  sourceUrl: row.source_url,
  message: row.message,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  addedByName: row.added_by_name ?? null
});

const mapQuestion = (row: QuestionRow) => ({
  id: row.id,
  question: row.question,
  category: row.category
});

const mapAnswer = (row: AnswerRow) => ({
  id: row.id,
  questionId: row.question_id,
  userId: row.user_id,
  answer: row.answer,
  answerDate: toDateOnly(row.answer_date),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  user: {
    name: row.user_name ?? "Người ấy",
    avatarUrl: row.avatar_url ?? null
  }
});

const mapRoomQuizAnswer = (row: RoomQuizAnswerRow) => ({
  id: row.id,
  quizId: row.quiz_id,
  userId: row.user_id,
  answer: row.answer,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  user: {
    name: row.user_name ?? "Người ấy",
    avatarUrl: row.avatar_url ?? null
  }
});

const mapRoomQuiz = (row: RoomQuizRow, answers: RoomQuizAnswerRow[] = []) => ({
  id: row.id,
  question: row.question,
  quizType: row.quiz_type,
  options: [row.option_a, row.option_b, row.option_c].filter(Boolean),
  createdBy: row.created_by,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  creator: {
    name: row.creator_name ?? "Người ấy",
    avatarUrl: row.creator_avatar_url ?? null
  },
  answers: answers.map(mapRoomQuizAnswer)
});

const mapQuizQuestion = (row: QuizGameQuestionRow, includeCorrect = false) => ({
  id: row.id,
  questionText: row.question_text,
  options: [
    { key: "A" as const, text: row.option_a },
    { key: "B" as const, text: row.option_b },
    row.option_c ? { key: "C" as const, text: row.option_c } : null,
    row.option_d ? { key: "D" as const, text: row.option_d } : null
  ].filter((option): option is { key: QuizOptionKey; text: string } => Boolean(option)),
  correctOption: includeCorrect ? row.correct_option : undefined,
  sortOrder: Number(row.sort_order)
});

const mapQuizAttempt = (row: QuizAttemptRow) => ({
  id: row.id,
  gameId: row.game_id,
  userId: row.user_id,
  score: Number(row.score),
  totalQuestions: Number(row.total_questions),
  durationSeconds: Number(row.duration_seconds),
  startedAt: toIso(row.started_at),
  completedAt: toIso(row.completed_at),
  user: {
    name: row.user_name ?? "Người ấy",
    avatarUrl: row.avatar_url ?? null
  }
});

const mapQuizGame = (
  row: QuizGameRow,
  questions: QuizGameQuestionRow[] = [],
  attempts: QuizAttemptRow[] = [],
  includeCorrect = false
) => ({
  id: row.id,
  title: row.title,
  meaning: row.meaning,
  timeLimitSeconds: Number(row.time_limit_seconds),
  status: row.status,
  createdBy: row.created_by,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  creator: {
    name: row.creator_name ?? "Người ấy",
    avatarUrl: row.creator_avatar_url ?? null
  },
  questions: questions.map((question) => mapQuizQuestion(question, includeCorrect)),
  attempts: attempts.map(mapQuizAttempt)
});

const mapMood = (row: MoodRow) => ({
  id: row.id,
  userId: row.user_id,
  mood: row.mood,
  note: row.note,
  moodDate: toDateOnly(row.mood_date),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  user: {
    name: row.user_name ?? "Người ấy",
    avatarUrl: row.avatar_url ?? null
  }
});

const mapPhoto = (row: PhotoRow) => ({
  id: row.id,
  albumId: row.album_id,
  uploadedBy: row.uploaded_by,
  imageUrl: row.image_url,
  caption: row.caption,
  createdAt: toIso(row.created_at),
  uploaderName: row.uploader_name ?? null
});

const mapAlbum = (album: AlbumRow, photos: PhotoRow[] = []) => ({
  id: album.id,
  title: album.title,
  description: album.description,
  createdBy: album.created_by,
  createdAt: toIso(album.created_at),
  updatedAt: toIso(album.updated_at),
  creatorName: album.creator_name ?? null,
  photos: photos.map(mapPhoto)
});

const mapNotification = (row: NotificationRow) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  content: row.content,
  isRead: Boolean(row.is_read),
  createdAt: toIso(row.created_at)
});

const queryMembers = async (roomId: string, connection: PoolConnection | typeof mysqlPool = mysqlPool) => {
  const [rows] = await connection.query<MemberRow[]>(
    `
      select u.id, u.name, u.email, u.avatar_url, u.last_seen_at, cm.role, cm.nickname, cm.joined_at
      from couple_members cm
      join users u on u.id = cm.user_id
      where cm.couple_room_id = ?
      order by cm.role = 'owner' desc, cm.joined_at asc
    `,
    [roomId]
  );

  return rows.map(mapMember);
};

const notifyPartner = async (
  roomId: string,
  actorId: string,
  type: string,
  title: string,
  content?: string | null,
  connection: PoolConnection | typeof mysqlPool = mysqlPool
) => {
  const [members] = await connection.query<Array<RowDataPacket & { user_id: string }>>(
    "select user_id from couple_members where couple_room_id = ? and user_id <> ?",
    [roomId, actorId]
  );

  await Promise.all(
    members.map((member) =>
      connection.execute(
        `
          insert into notifications (id, couple_room_id, user_id, type, title, content)
          values (?, ?, ?, ?, ?, ?)
        `,
        [uuid(), roomId, member.user_id, type, title, content ?? null]
      )
    )
  );
};

const notifyRoom = async (
  roomId: string,
  type: string,
  title: string,
  content?: string | null,
  connection: PoolConnection | typeof mysqlPool = mysqlPool
) => {
  const [members] = await connection.query<Array<RowDataPacket & { user_id: string }>>(
    "select user_id from couple_members where couple_room_id = ?",
    [roomId]
  );

  await Promise.all(
    members.map((member) =>
      connection.execute(
        `
          insert into notifications (id, couple_room_id, user_id, type, title, content)
          values (?, ?, ?, ?, ?, ?)
        `,
        [uuid(), roomId, member.user_id, type, title, content ?? null]
      )
    )
  );
};

const pushDueCalendarNotifications = async (roomId: string) => {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();
    const [events] = await connection.query<CalendarEventRow[]>(
      `
        select *
        from calendar_events
        where couple_room_id = ? and reminder_sent_at is null and starts_at <= now()
        order by starts_at asc
        limit 10
      `,
      [roomId]
    );

    for (const event of events) {
      await notifyRoom(
        roomId,
        "CALENDAR_DUE",
        "Hôm nay có lịch hẹn",
        `${event.title} - ${toIso(event.starts_at)}`,
        connection
      );
      await connection.execute("update calendar_events set reminder_sent_at = now() where id = ?", [event.id]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const requireRoom = async (userId: string) => {
  const room = await getCurrentCoupleRoom(userId);

  if (!room) {
    throw new Error("Bạn cần tạo hoặc tham gia phòng riêng trước");
  }

  return room;
};

export const getMyRoom = async (userId: string) => {
  const room = await getCurrentCoupleRoom(userId);

  if (!room) {
    return null;
  }

  const members = await queryMembers(room.id);

  return {
    ...room,
    members
  };
};

export const createRoom = async (
  userId: string,
  input: { roomName?: unknown; anniversaryDate?: unknown; nickname?: unknown }
) => {
  if (await getCurrentCoupleRoom(userId)) {
    throw new Error("Bạn đang có một phòng riêng rồi");
  }

  const roomName = requireText(input.roomName, "Vui lòng đặt tên cho thế giới nhỏ", 160);
  const anniversaryDate = trimOrNull(input.anniversaryDate);
  const nickname = trimOrNull(input.nickname);
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    let inviteCode = createInviteCode();
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const [existing] = await connection.query<Array<RowDataPacket & { id: string }>>(
        "select id from couple_rooms where invite_code = ? limit 1",
        [inviteCode]
      );

      if (!existing[0]) {
        break;
      }

      inviteCode = createInviteCode();
    }

    const roomId = uuid();

    await connection.execute(
      `
        insert into couple_rooms (id, room_name, invite_code, owner_user_id, anniversary_date)
        values (?, ?, ?, ?, ?)
      `,
      [roomId, roomName, inviteCode, userId, anniversaryDate]
    );
    await connection.execute(
      `
        insert into couple_members (id, couple_room_id, user_id, role, nickname)
        values (?, ?, ?, 'owner', ?)
      `,
      [uuid(), roomId, userId, nickname]
    );
    await connection.execute(
      `
        insert into albums (id, couple_room_id, title, description, created_by)
        values (?, ?, 'Album của tụi mình', 'Những bức ảnh chỉ hai đứa mình lưu lại.', ?)
      `,
      [uuid(), roomId, userId]
    );

    await connection.commit();

    return getMyRoom(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const joinRoom = async (userId: string, inviteCodeInput: unknown, nicknameInput?: unknown) => {
  if (await getCurrentCoupleRoom(userId)) {
    throw new Error("Bạn đang có một phòng riêng rồi");
  }

  const inviteCode = normalizeInviteCode(requireText(inviteCodeInput, "Vui lòng nhập mã mời", 32));
  const nickname = trimOrNull(nicknameInput);
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const [rooms] = await connection.query<
      Array<RowDataPacket & { id: string; owner_user_id: string; room_name: string; member_count: number }>
    >(
      `
        select cr.id, cr.owner_user_id, cr.room_name, count(cm.user_id) as member_count
        from couple_rooms cr
        left join couple_members cm on cm.couple_room_id = cr.id
        where cr.invite_code = ?
        group by cr.id
        limit 1
      `,
      [inviteCode]
    );
    const room = rooms[0];

    if (!room) {
      throw new Error("Mã mời không hợp lệ hoặc đã được đổi");
    }

    if (Number(room.member_count) >= 2) {
      throw new Error("Phòng riêng này đã đủ hai người");
    }

    await connection.execute(
      `
        insert into couple_members (id, couple_room_id, user_id, role, nickname)
        values (?, ?, ?, 'partner', ?)
      `,
      [uuid(), room.id, userId, nickname]
    );
    await notifyPartner(
      room.id,
      userId,
      "ROOM_JOINED",
      "Người ấy đã vào phòng",
      "Căn phòng nhỏ của hai bạn đã có đủ hai người.",
      connection
    );
    await connection.commit();

    return getMyRoom(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateRoom = async (
  userId: string,
  input: { roomName?: unknown; anniversaryDate?: unknown; nickname?: unknown; roomBio?: unknown; theme?: unknown }
) => {
  const room = await requireRoom(userId);
  const roomName = trimOrNull(input.roomName);
  const anniversaryDate = trimOrNull(input.anniversaryDate);
  const nickname = trimOrNull(input.nickname);
  const roomBio = trimOrNull(input.roomBio);
  const theme =
    typeof input.theme === "string" && ["violet", "ocean", "sunset"].includes(input.theme) ? input.theme : null;

  await mysqlPool.execute(
    `
      update couple_rooms
      set
        room_name = coalesce(?, room_name),
        anniversary_date = ?,
        room_bio = ?,
        theme = coalesce(?, theme)
      where id = ?
    `,
    [roomName, anniversaryDate, roomBio, theme, room.id]
  );
  await mysqlPool.execute(
    "update couple_members set nickname = coalesce(?, nickname) where couple_room_id = ? and user_id = ?",
    [nickname, room.id, userId]
  );
  await notifyPartner(room.id, userId, "ROOM_UPDATED", "Phòng riêng vừa được cập nhật", roomName ? `Tên phòng mới: ${roomName}` : null);

  return getMyRoom(userId);
};

export const updateRoomAvatar = async (userId: string, avatarUrl: string) => {
  const room = await requireRoom(userId);

  await mysqlPool.execute("update couple_rooms set couple_avatar_url = ? where id = ?", [avatarUrl, room.id]);

  return getMyRoom(userId);
};

export const getSummary = async (userId: string) => {
  const room = await requireRoom(userId);
  const [memories] = await mysqlPool.query<MemoryRow[]>(
    `
      select m.*, u.name as creator_name, u.avatar_url as creator_avatar_url
      from memories m
      join users u on u.id = m.created_by
      where m.couple_room_id = ?
      order by m.memory_date desc, m.created_at desc
      limit 4
    `,
    [room.id]
  );
  const [songs] = await mysqlPool.query<SongRow[]>(
    `
      select s.*, u.name as added_by_name
      from songs s
      join users u on u.id = s.added_by
      where s.couple_room_id = ?
      order by s.created_at desc
      limit 1
    `,
    [room.id]
  );
  const [tasks] = await mysqlPool.query<TaskRow[]>(
    `
      select t.*, u.name as creator_name
      from couple_tasks t
      join users u on u.id = t.created_by
      where t.couple_room_id = ? and t.status <> 'done'
      order by t.created_at desc
      limit 5
    `,
    [room.id]
  );

  return {
    room: await getMyRoom(userId),
    todayMoods: await getTodayMoods(userId),
    recentMemories: memories.map(mapMemory),
    currentSong: songs[0] ? mapSong(songs[0]) : null,
    pendingTasks: tasks.map(mapTask),
    dailyQuestion: await getTodayQuestion()
  };
};

export const listMemories = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<MemoryRow[]>(
    `
      select m.*, u.name as creator_name, u.avatar_url as creator_avatar_url
      from memories m
      join users u on u.id = m.created_by
      where m.couple_room_id = ?
      order by m.memory_date desc, m.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapMemory);
};

export const createMemory = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập tên kỷ niệm");
  const memoryDate = trimOrNull(input.memoryDate) ?? today();
  const imageUrl = await resolveImageUrl(userId, input);
  const placeName = trimOrNull(input.placeName);
  const id = uuid();

  if (!imageUrl && !placeName) {
    throw new Error("Kỷ niệm cần có ảnh hoặc địa điểm đã đi qua");
  }

  await mysqlPool.execute(
    `
      insert into memories (id, couple_room_id, created_by, title, content, memory_date, image_url, place_name)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [id, room.id, userId, title, trimOrNull(input.content), memoryDate, imageUrl, placeName]
  );
  await notifyPartner(room.id, userId, "MEMORY_CREATED", "Có kỷ niệm mới", title);

  return listMemories(userId);
};

export const updateMemory = async (userId: string, memoryId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("memories", memoryId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy kỷ niệm trong phòng của bạn");
  }

  const nextImageUrl = await resolveImageUrl(userId, input);
  const placeName = trimOrNull(input.placeName);

  await mysqlPool.execute(
    `
      update memories set
        title = coalesce(?, title),
        content = ?,
        memory_date = coalesce(?, memory_date),
        image_url = coalesce(?, image_url),
        place_name = ?
      where id = ? and couple_room_id = ?
    `,
    [
      trimOrNull(input.title),
      trimOrNull(input.content),
      trimOrNull(input.memoryDate),
      nextImageUrl,
      placeName,
      memoryId,
      room.id
    ]
  );

  return listMemories(userId);
};

export const deleteMemory = async (userId: string, memoryId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from memories where id = ? and couple_room_id = ?",
    [memoryId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy kỷ niệm trong phòng của bạn");
  }

  return { deleted: true };
};

export const listLetters = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<LetterRow[]>(
    `
      select l.*, sender.name as sender_name, receiver.name as receiver_name
      from private_letters l
      join users sender on sender.id = l.sender_id
      left join users receiver on receiver.id = l.receiver_id
      where l.couple_room_id = ?
      order by l.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapLetter);
};

export const createLetter = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập tiêu đề lời nhắn");
  const content = requireText(input.content, "Vui lòng viết lời nhắn", 10000);
  const receiverId = trimOrNull(input.receiverId);
  const envelope = typeof input.envelope === "string" && ["rose", "ocean", "gold", "violet"].includes(input.envelope) ? input.envelope : "rose";
  const paper = typeof input.paper === "string" && ["cream", "lined", "starry"].includes(input.paper) ? input.paper : "cream";
  const font = typeof input.font === "string" && ["hand", "serif", "default"].includes(input.font) ? input.font : "hand";

  if (receiverId) {
    const [rows] = await mysqlPool.query<Array<RowDataPacket & { user_id: string }>>(
      "select user_id from couple_members where couple_room_id = ? and user_id = ? limit 1",
      [room.id, receiverId]
    );

    if (!rows[0]) {
      throw new Error("Người nhận không thuộc phòng này");
    }
  }

  await mysqlPool.execute(
    `
      insert into private_letters (id, couple_room_id, sender_id, receiver_id, title, content, mood, unlock_at, is_secret, envelope, paper, font)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid(),
      room.id,
      userId,
      receiverId,
      title,
      content,
      trimOrNull(input.mood),
      trimOrNull(input.unlockAt),
      input.isSecret ? 1 : 0,
      envelope,
      paper,
      font
    ]
  );
  await notifyPartner(room.id, userId, "LETTER_CREATED", "Có một lời nhắn mới", title);

  return listLetters(userId);
};

export const updateLetter = async (userId: string, letterId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("private_letters", letterId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy lời nhắn trong phòng của bạn");
  }

  await mysqlPool.execute(
    `
      update private_letters set
        title = coalesce(?, title),
        content = coalesce(?, content),
        mood = ?,
        unlock_at = ?,
        is_secret = ?
      where id = ? and couple_room_id = ?
    `,
    [
      trimOrNull(input.title),
      trimOrNull(input.content),
      trimOrNull(input.mood),
      trimOrNull(input.unlockAt),
      input.isSecret ? 1 : 0,
      letterId,
      room.id
    ]
  );

  return listLetters(userId);
};

export const deleteLetter = async (userId: string, letterId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from private_letters where id = ? and couple_room_id = ?",
    [letterId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy lời nhắn trong phòng của bạn");
  }

  return { deleted: true };
};

export const pinLoveNote = async (userId: string, letterId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("private_letters", letterId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy lời nhắn trong phòng của bạn");
  }

  await mysqlPool.execute("update private_letters set pinned = 0 where couple_room_id = ?", [room.id]);
  await mysqlPool.execute("update private_letters set pinned = 1 where id = ? and couple_room_id = ?", [letterId, room.id]);

  return listLetters(userId);
};

// Đánh dấu đã mở thư: chỉ ghi opened_at khi người mở là NGƯỜI NHẬN (không phải người gửi)
// và thư chưa từng được mở — để người gửi thấy "đã xem" và không bị hỏi mở lại.
export const openLetter = async (userId: string, letterId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("private_letters", letterId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy lời nhắn trong phòng của bạn");
  }

  await mysqlPool.execute(
    "update private_letters set opened_at = now() where id = ? and couple_room_id = ? and sender_id <> ? and opened_at is null",
    [letterId, room.id, userId]
  );

  return listLetters(userId);
};

type BucketRow = RowDataPacket & {
  id: string;
  title: string;
  note: string | null;
  is_done: 0 | 1;
  done_at: Date | string | null;
  created_at: Date | string;
  creator_name?: string | null;
};

const mapBucket = (row: BucketRow) => ({
  id: row.id,
  title: row.title,
  note: row.note,
  isDone: Boolean(row.is_done),
  doneAt: toIso(row.done_at),
  createdAt: toIso(row.created_at),
  creatorName: row.creator_name ?? null
});

export const listBucket = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<BucketRow[]>(
    `
      select b.*, u.name as creator_name
      from bucket_items b
      join users u on u.id = b.created_by
      where b.couple_room_id = ?
      order by b.is_done asc, b.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapBucket);
};

export const createBucket = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập điều hai bạn muốn làm cùng nhau", 220);

  await mysqlPool.execute(
    "insert into bucket_items (id, couple_room_id, created_by, title, note) values (?, ?, ?, ?, ?)",
    [uuid(), room.id, userId, title, trimOrNull(input.note)]
  );
  await notifyPartner(room.id, userId, "BUCKET_CREATED", "Có mong ước chung mới", title);

  return listBucket(userId);
};

export const toggleBucket = async (userId: string, bucketId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("bucket_items", bucketId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy mong ước trong phòng của bạn");
  }

  await mysqlPool.execute(
    `
      update bucket_items
      set is_done = 1 - is_done,
          done_at = case when is_done = 0 then now() else null end
      where id = ? and couple_room_id = ?
    `,
    [bucketId, room.id]
  );

  return listBucket(userId);
};

export const deleteBucket = async (userId: string, bucketId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("bucket_items", bucketId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy mong ước trong phòng của bạn");
  }

  await mysqlPool.execute("delete from bucket_items where id = ? and couple_room_id = ?", [bucketId, room.id]);

  return listBucket(userId);
};

type WalletRow = RowDataPacket & {
  id: string;
  category: string;
  title: string;
  amount: number | string;
  note: string | null;
  spent_at: Date | string | null;
  created_by: string;
  creator_name?: string | null;
  created_at: Date | string;
};

const mapWallet = (row: WalletRow) => ({
  id: row.id,
  category: row.category,
  title: row.title,
  amount: Number(row.amount),
  note: row.note,
  spentAt: toIso(row.spent_at),
  createdBy: row.created_by,
  creatorName: row.creator_name ?? null,
  createdAt: toIso(row.created_at)
});

export const listWallet = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<WalletRow[]>(
    `
      select w.*, u.name as creator_name
      from wallet_entries w
      join users u on u.id = w.created_by
      where w.couple_room_id = ?
      order by coalesce(w.spent_at, w.created_at) desc, w.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapWallet);
};

export const createWallet = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập nội dung khoản chi", 180);
  const category = trimOrNull(input.category) ?? "Khác";
  const amountRaw = Number(input.amount);
  const amount = Number.isFinite(amountRaw) && amountRaw >= 0 ? Math.round(amountRaw) : 0;

  await mysqlPool.execute(
    "insert into wallet_entries (id, couple_room_id, created_by, category, title, amount, note, spent_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    [uuid(), room.id, userId, category, title, amount, trimOrNull(input.note), trimOrNull(input.spentAt)]
  );
  await notifyPartner(room.id, userId, "WALLET_ADDED", "Có khoản chi tiêu mới", title);

  return listWallet(userId);
};

export const deleteWallet = async (userId: string, walletId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("wallet_entries", walletId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy khoản chi trong phòng của bạn");
  }

  await mysqlPool.execute("delete from wallet_entries where id = ? and couple_room_id = ?", [walletId, room.id]);

  return listWallet(userId);
};

export const getStats = async (userId: string) => {
  const room = await requireRoom(userId);
  const countOf = async (sql: string) => {
    const [rows] = await mysqlPool.query<CountRow[]>(sql, [room.id]);
    return Number(rows[0]?.count ?? 0);
  };

  const [letters, memories, photos, events, dates, songs, bucketDone, moods] = await Promise.all([
    countOf("select count(*) as count from private_letters where couple_room_id = ?"),
    countOf("select count(*) as count from memories where couple_room_id = ?"),
    countOf("select count(*) as count from album_photos where couple_room_id = ?"),
    countOf("select count(*) as count from calendar_events where couple_room_id = ?"),
    countOf("select count(*) as count from calendar_events where couple_room_id = ? and starts_at < now()"),
    countOf("select count(*) as count from songs where couple_room_id = ?"),
    countOf("select count(*) as count from bucket_items where couple_room_id = ? and is_done = 1"),
    countOf("select count(*) as count from moods where couple_room_id = ?")
  ]);

  return { letters, memories, photos, events, dates, songs, bucketDone, moods };
};

// ===== Mini-game: Cờ caro (tic-tac-toe) realtime =====
type GameRow = RowDataPacket & {
  couple_room_id: string;
  board: string;
  turn: "X" | "O";
  x_user_id: string | null;
  o_user_id: string | null;
  status: "idle" | "pending" | "rps" | "playing" | "won" | "draw";
  winner: "X" | "O" | null;
  invited_by: string | null;
  x_rps: "R" | "P" | "S" | null;
  o_rps: "R" | "P" | "S" | null;
  first_symbol: "X" | "O" | null;
  x_score: number;
  o_score: number;
  draws: number;
  round: number;
};

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const checkTicWinner = (cells: string[]): "X" | "O" | null => {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] !== "_" && cells[a] === cells[b] && cells[b] === cells[c]) {
      return cells[a] as "X" | "O";
    }
  }
  return null;
};

// Oẳn tù tì: Búa (R) thắng Kéo (S), Kéo (S) thắng Bao (P), Bao (P) thắng Búa (R)
const RPS_BEATS: Record<string, string> = { R: "S", S: "P", P: "R" };
const rpsWinner = (x: string, o: string): "X" | "O" | null => (x === o ? null : RPS_BEATS[x] === o ? "X" : "O");

const gameNames = async (game: GameRow): Promise<Record<string, string>> => {
  const ids = [game.x_user_id, game.o_user_id].filter(Boolean) as string[];
  if (!ids.length) {
    return {};
  }
  const [rows] = await mysqlPool.query<Array<RowDataPacket & { id: string; name: string }>>(
    `select id, name from users where id in (${ids.map(() => "?").join(",")})`,
    ids
  );
  return Object.fromEntries(rows.map((row) => [row.id, row.name]));
};

const mapGame = (game: GameRow, userId: string, names: Record<string, string>) => {
  const mySymbol = game.x_user_id === userId ? "X" : game.o_user_id === userId ? "O" : null;
  const yourTurn =
    game.status === "playing" &&
    ((game.x_user_id === userId && game.turn === "X") || (game.o_user_id === userId && game.turn === "O"));
  // Chỉ lộ dữ liệu oẳn tù tì khi còn ý nghĩa (đang oẳn tù tì hoặc đang chơi).
  // won/draw/idle/pending KHÔNG được trả kết quả cũ -> tránh FE tái dùng/replay reveal cũ.
  const showRps = game.status === "rps" || game.status === "playing";

  return {
    board: game.board.split("").map((cell) => (cell === "_" ? null : (cell as "X" | "O"))),
    turn: game.turn,
    status: game.status,
    winner: game.winner,
    round: game.round,
    mySymbol,
    yourTurn,
    invitedByMe: game.status === "pending" && game.invited_by === userId,
    inviteFromPartner: game.status === "pending" && game.invited_by !== null && game.invited_by !== userId,
    rps: {
      xPicked: showRps && Boolean(game.x_rps),
      oPicked: showRps && Boolean(game.o_rps),
      myChoice: (showRps ? (mySymbol === "X" ? game.x_rps : mySymbol === "O" ? game.o_rps : null) : null) as "R" | "P" | "S" | null,
      revealed: showRps && Boolean(game.x_rps && game.o_rps),
      x: showRps && game.x_rps && game.o_rps ? game.x_rps : null,
      o: showRps && game.x_rps && game.o_rps ? game.o_rps : null,
      firstSymbol: showRps ? game.first_symbol : null
    },
    scores: { x: game.x_score, o: game.o_score, draws: game.draws },
    xName: game.x_user_id ? names[game.x_user_id] ?? "Người chơi 1" : "Đang chờ",
    oName: game.o_user_id ? names[game.o_user_id] ?? "Người chơi 2" : "Đang chờ"
  };
};

// Lấy (hoặc khởi tạo) dòng game của phòng. Người mở game đầu tiên cầm quân X.
const loadGameRow = async (roomId: string, userId: string): Promise<GameRow> => {
  const [rows] = await mysqlPool.query<GameRow[]>("select * from couple_games where couple_room_id = ? limit 1", [roomId]);
  if (rows[0]) {
    return rows[0];
  }

  const [members] = await mysqlPool.query<Array<RowDataPacket & { user_id: string }>>(
    "select user_id from couple_members where couple_room_id = ? order by (user_id = ?) desc, joined_at asc",
    [roomId, userId]
  );
  const xId = members[0]?.user_id ?? userId;
  const oId = members.find((member) => member.user_id !== xId)?.user_id ?? null;

  await mysqlPool.execute(
    "insert into couple_games (couple_room_id, board, turn, x_user_id, o_user_id, status, winner, round) values (?, '_________', 'X', ?, ?, 'idle', null, 1)",
    [roomId, xId, oId]
  );
  const [created] = await mysqlPool.query<GameRow[]>("select * from couple_games where couple_room_id = ? limit 1", [roomId]);
  return created[0];
};

export const getGame = async (userId: string) => {
  const room = await requireRoom(userId);
  const game = await loadGameRow(room.id, userId);
  return mapGame(game, userId, await gameNames(game));
};

export const makeGameMove = async (userId: string, rawIndex: unknown) => {
  const room = await requireRoom(userId);
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    throw new Error("Ô không hợp lệ");
  }

  const game = await loadGameRow(room.id, userId);
  const mySymbol = game.x_user_id === userId ? "X" : game.o_user_id === userId ? "O" : null;
  if (!mySymbol) {
    throw new Error("Bạn không thuộc ván này");
  }
  if (game.status !== "playing") {
    throw new Error("Ván đã kết thúc, hãy chơi lại");
  }
  if (mySymbol !== game.turn) {
    throw new Error("Chưa tới lượt bạn");
  }

  const cells = game.board.split("");
  if (cells[index] !== "_") {
    throw new Error("Ô này đã được đánh");
  }

  cells[index] = mySymbol;
  const winner = checkTicWinner(cells);
  const isFull = !cells.includes("_");
  const status = winner ? "won" : isFull ? "draw" : "playing";
  const nextTurn = mySymbol === "X" ? "O" : "X";
  // Cộng điểm bảng xếp hạng đúng một lần ngay tại nước kết thúc ván
  const scoreSet =
    winner === "X"
      ? ", x_score = x_score + 1"
      : winner === "O"
        ? ", o_score = o_score + 1"
        : status === "draw"
          ? ", draws = draws + 1"
          : "";

  // Ván kết thúc (won/draw) -> dọn luôn kết quả oẳn tù tì để ván sau không bị tái dùng kết quả cũ.
  // Nước thường (vẫn 'playing') KHÔNG dọn, để màn reveal kéo/búa/bao đầu ván còn dữ liệu.
  const endReset = status === "playing" ? "" : ", x_rps = null, o_rps = null, first_symbol = null";
  // `and status = 'playing'`: chỉ nước kết thúc ĐẦU TIÊN mới đổi trạng thái + cộng điểm
  // (chống cộng điểm 2 lần khi có request trùng/đua nhau).
  await mysqlPool.execute(
    `update couple_games set board = ?, turn = ?, status = ?, winner = ?, updated_by = ?${scoreSet}${endReset} where couple_room_id = ? and status = 'playing'`,
    [cells.join(""), status === "playing" ? nextTurn : game.turn, status, winner, userId, room.id]
  );
  return getGame(userId);
};

// Mời chơi: chuyển sang trạng thái CHỜ đối phương đồng ý
export const inviteGame = async (userId: string) => {
  const room = await requireRoom(userId);
  const game = await loadGameRow(room.id, userId);
  if (game.status === "playing" || game.status === "rps") {
    throw new Error("Đang có ván đang diễn ra, hãy vào bàn cờ");
  }
  if (game.status === "pending") {
    throw new Error(
      game.invited_by === userId ? "Đang chờ đối phương đồng ý lời mời" : "Đối phương vừa mời bạn, hãy chấp nhận nhé"
    );
  }
  await mysqlPool.execute(
    "update couple_games set board = '_________', turn = 'X', status = 'pending', winner = null, x_rps = null, o_rps = null, first_symbol = null, invited_by = ?, updated_by = ? where couple_room_id = ? and status in ('idle', 'won', 'draw')",
    [userId, userId, room.id]
  );
  return getGame(userId);
};

// Chấp nhận lời mời -> sang pha oẳn tù tì để quyết ai đi trước (cả hai đã đồng ý)
export const acceptGame = async (userId: string) => {
  const room = await requireRoom(userId);
  const game = await loadGameRow(room.id, userId);
  if (game.status !== "pending") {
    throw new Error("Không có lời mời nào");
  }
  if (game.invited_by === userId) {
    throw new Error("Bạn là người mời, hãy đợi đối phương đồng ý");
  }
  const mySymbol = game.x_user_id === userId ? "X" : game.o_user_id === userId ? "O" : null;
  if (!mySymbol) {
    throw new Error("Bạn không thuộc ván này");
  }
  // atomic: chỉ chấp nhận khi vẫn đang 'pending' và do ĐỐI PHƯƠNG mời
  await mysqlPool.execute(
    "update couple_games set board = '_________', turn = 'X', status = 'rps', winner = null, x_rps = null, o_rps = null, first_symbol = null, round = round + 1, updated_by = ? where couple_room_id = ? and status = 'pending' and invited_by <> ?",
    [userId, room.id, userId]
  );
  return getGame(userId);
};

// Oẳn tù tì quyết ai đi trước: mỗi người chọn kín 1 lần; cả hai chọn xong -> thắng đi trước (hoà thì chọn lại)
export const playRps = async (userId: string, rawChoice: unknown) => {
  const room = await requireRoom(userId);
  const game = await loadGameRow(room.id, userId);
  if (game.status !== "rps") {
    throw new Error("Chưa tới lượt oẳn tù tì");
  }
  const mySymbol = game.x_user_id === userId ? "X" : game.o_user_id === userId ? "O" : null;
  if (!mySymbol) {
    throw new Error("Bạn không thuộc ván này");
  }
  const choice = typeof rawChoice === "string" ? rawChoice.toUpperCase() : "";
  if (!["R", "P", "S"].includes(choice)) {
    throw new Error("Lựa chọn không hợp lệ");
  }

  const column = mySymbol === "X" ? "x_rps" : "o_rps";
  // chọn một lần (kín), chỉ ghi khi còn ở pha rps và mình chưa chọn
  await mysqlPool.execute(
    `update couple_games set ${column} = ?, updated_by = ? where couple_room_id = ? and status = 'rps' and ${column} is null`,
    [choice, userId, room.id]
  );

  const fresh = await loadGameRow(room.id, userId);
  if (fresh.status === "rps" && fresh.x_rps && fresh.o_rps) {
    const winnerSymbol = rpsWinner(fresh.x_rps, fresh.o_rps);
    if (!winnerSymbol) {
      // hoà -> xoá lựa chọn, chọn lại
      await mysqlPool.execute(
        "update couple_games set x_rps = null, o_rps = null where couple_room_id = ? and status = 'rps'",
        [room.id]
      );
    } else {
      // người thắng oẳn tù tì được đi trước
      await mysqlPool.execute(
        "update couple_games set status = 'playing', turn = ?, first_symbol = ? where couple_room_id = ? and status = 'rps'",
        [winnerSymbol, winnerSymbol, room.id]
      );
    }
  }
  return getGame(userId);
};

// Từ chối hoặc huỷ lời mời
export const declineGame = async (userId: string) => {
  const room = await requireRoom(userId);
  await loadGameRow(room.id, userId);
  await mysqlPool.execute(
    "update couple_games set status = 'idle', invited_by = null, updated_by = ? where couple_room_id = ? and status = 'pending'",
    [userId, room.id]
  );
  return getGame(userId);
};

// Đầu hàng: người bấm thua, đối phương thắng + cộng điểm (atomic, chống cộng 2 lần)
export const surrenderGame = async (userId: string) => {
  const room = await requireRoom(userId);
  const game = await loadGameRow(room.id, userId);
  if (game.status !== "playing") {
    throw new Error("Chưa có ván đang chơi");
  }
  const mySymbol = game.x_user_id === userId ? "X" : game.o_user_id === userId ? "O" : null;
  if (!mySymbol) {
    throw new Error("Bạn không thuộc ván này");
  }
  const winnerSymbol = mySymbol === "X" ? "O" : "X";
  const scoreSet = winnerSymbol === "X" ? ", x_score = x_score + 1" : ", o_score = o_score + 1";
  await mysqlPool.execute(
    `update couple_games set status = 'won', winner = ?, updated_by = ?, x_rps = null, o_rps = null, first_symbol = null${scoreSet} where couple_room_id = ? and status = 'playing'`,
    [winnerSymbol, userId, room.id]
  );
  return getGame(userId);
};

type ChallengeRow = RowDataPacket & {
  id: string;
  title: string;
  target_days: number;
  created_at: Date | string;
};

const formatDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const listChallenges = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<ChallengeRow[]>(
    "select * from challenges where couple_room_id = ? order by created_at desc",
    [room.id]
  );
  const [checks] = await mysqlPool.query<Array<RowDataPacket & { challenge_id: string; d: string }>>(
    "select challenge_id, date_format(check_date, '%Y-%m-%d') as d from challenge_checkins where couple_room_id = ?",
    [room.id]
  );

  const byChallenge = new Map<string, Set<string>>();
  for (const row of checks) {
    const set = byChallenge.get(row.challenge_id) ?? new Set<string>();
    set.add(row.d);
    byChallenge.set(row.challenge_id, set);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDay(today);

  return rows.map((row) => {
    const dates = byChallenge.get(row.id) ?? new Set<string>();
    const todayChecked = dates.has(todayStr);
    let streak = 0;
    const cursor = new Date(today);
    if (!todayChecked) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (dates.has(formatDay(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      id: row.id,
      title: row.title,
      targetDays: Number(row.target_days),
      doneDays: dates.size,
      todayChecked,
      streak
    };
  });
};

export const createChallenge = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập tên thử thách", 180);
  const targetRaw = Number(input.targetDays);
  const targetDays = Number.isFinite(targetRaw) && targetRaw >= 1 && targetRaw <= 365 ? Math.round(targetRaw) : 30;

  await mysqlPool.execute(
    "insert into challenges (id, couple_room_id, created_by, title, target_days) values (?, ?, ?, ?, ?)",
    [uuid(), room.id, userId, title, targetDays]
  );
  await notifyPartner(room.id, userId, "CHALLENGE_CREATED", "Có thử thách mới", title);

  return listChallenges(userId);
};
export const updateChallenge = async (userId: string, challengeId: string, input: Record<string, unknown>) => {
}
export const checkinChallenge = async (userId: string, challengeId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("challenges", challengeId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy thử thách trong phòng của bạn");
  }

  const [existing] = await mysqlPool.query<Array<RowDataPacket & { id: string }>>(
    "select id from challenge_checkins where challenge_id = ? and check_date = curdate() limit 1",
    [challengeId]
  );

  if (existing[0]) {
    await mysqlPool.execute("delete from challenge_checkins where challenge_id = ? and check_date = curdate()", [challengeId]);
  } else {
    await mysqlPool.execute(
      "insert into challenge_checkins (id, challenge_id, couple_room_id, user_id, check_date) values (?, ?, ?, ?, curdate())",
      [uuid(), challengeId, room.id, userId]
    );
  }

  return listChallenges(userId);
};

export const deleteChallenge = async (userId: string, challengeId: string) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("challenges", challengeId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy thử thách trong phòng của bạn");
  }

  await mysqlPool.execute("delete from challenges where id = ? and couple_room_id = ?", [challengeId, room.id]);

  return listChallenges(userId);
};

export const listTasks = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<TaskRow[]>(
    `
      select t.*, u.name as creator_name
      from couple_tasks t
      join users u on u.id = t.created_by
      where t.couple_room_id = ?
      order by field(t.status, 'doing', 'todo', 'done'), t.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapTask);
};

export const createTask = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập điều muốn làm cùng nhau");

  await mysqlPool.execute(
    `
      insert into couple_tasks (id, couple_room_id, created_by, title, description, category, status)
      values (?, ?, ?, ?, ?, ?, 'todo')
    `,
    [uuid(), room.id, userId, title, trimOrNull(input.description), trimOrNull(input.category)]
  );
  await notifyPartner(room.id, userId, "TASK_CREATED", "Có một việc chung mới", title);

  return listTasks(userId);
};

export const updateTask = async (userId: string, taskId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const status = trimOrNull(input.status);

  if (status && !["todo", "doing", "done"].includes(status)) {
    throw new Error("Trạng thái việc chung không hợp lệ");
  }

  const [result] = await mysqlPool.execute<ResultSetHeader>(
    `
      update couple_tasks set
        title = coalesce(?, title),
        description = ?,
        category = ?,
        status = coalesce(?, status),
        completed_at = case when ? = 'done' then coalesce(completed_at, now()) when ? in ('todo', 'doing') then null else completed_at end
      where id = ? and couple_room_id = ?
    `,
    [
      trimOrNull(input.title),
      trimOrNull(input.description),
      trimOrNull(input.category),
      status,
      status,
      status,
      taskId,
      room.id
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy việc chung trong phòng của bạn");
  }

  return listTasks(userId);
};

export const markTaskDone = (userId: string, taskId: string) => updateTask(userId, taskId, { status: "done" });

export const deleteTask = async (userId: string, taskId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from couple_tasks where id = ? and couple_room_id = ?",
    [taskId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy việc chung trong phòng của bạn");
  }

  return { deleted: true };
};

const normalizeEventType = (value: unknown): CalendarEventRow["event_type"] => {
  const eventType = trimOrNull(value) ?? "date";

  if (["date", "camping", "picnic", "movie", "dinner", "travel", "birthday", "anniversary", "other"].includes(eventType)) {
    return eventType as CalendarEventRow["event_type"];
  }

  throw new Error("Loại lịch hẹn không hợp lệ");
};

const normalizeStartsAt = (value: unknown) => {
  const text = requireText(value, "Vui lòng chọn ngày và giờ", 40);
  const date = new Date(text);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Ngày giờ không hợp lệ");
  }

  return text.replace("T", " ").slice(0, 16) + ":00";
};

export const listCalendarEvents = async (userId: string) => {
  const room = await requireRoom(userId);
  await pushDueCalendarNotifications(room.id);
  const [rows] = await mysqlPool.query<CalendarEventRow[]>(
    `
      select ce.*, u.name as creator_name
      from calendar_events ce
      join users u on u.id = ce.created_by
      where ce.couple_room_id = ?
      order by ce.starts_at asc
    `,
    [room.id]
  );

  return rows.map(mapCalendarEvent);
};

export const createCalendarEvent = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập nội dung lịch hẹn");
  const eventType = normalizeEventType(input.eventType);
  const startsAt = normalizeStartsAt(input.startsAt);

  await mysqlPool.execute(
    `
      insert into calendar_events (id, couple_room_id, created_by, title, event_type, description, starts_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `,
    [uuid(), room.id, userId, title, eventType, trimOrNull(input.description), startsAt]
  );
  await notifyPartner(room.id, userId, "CALENDAR_CREATED", "Có lịch hẹn mới", title);

  return listCalendarEvents(userId);
};

export const updateCalendarEvent = async (userId: string, eventId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("calendar_events", eventId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy lịch hẹn trong phòng của bạn");
  }

  await mysqlPool.execute(
    `
      update calendar_events set
        title = coalesce(?, title),
        event_type = coalesce(?, event_type),
        description = ?,
        starts_at = coalesce(?, starts_at),
        reminder_sent_at = null
      where id = ? and couple_room_id = ?
    `,
    [trimOrNull(input.title), input.eventType ? normalizeEventType(input.eventType) : null, trimOrNull(input.description), input.startsAt ? normalizeStartsAt(input.startsAt) : null, eventId, room.id]
  );

  return listCalendarEvents(userId);
};

export const deleteCalendarEvent = async (userId: string, eventId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from calendar_events where id = ? and couple_room_id = ?",
    [eventId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy lịch hẹn trong phòng của bạn");
  }

  return { deleted: true };
};

export const listSongs = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<SongRow[]>(
    `
      select s.*, u.name as added_by_name
      from songs s
      join users u on u.id = s.added_by
      where s.couple_room_id = ?
      order by s.created_at desc
    `,
    [room.id]
  );

  return rows.map(mapSong);
};

export const addSong = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng nhập tên bài hát");
  const sourceUrl = requireText(input.sourceUrl, "Vui lòng nhập link nhạc", 800);
  const sourceType = trimOrNull(input.sourceType) ?? "custom";

  if (!["soundcloud", "youtube", "spotify", "custom"].includes(sourceType)) {
    throw new Error("Nguồn nhạc không hợp lệ");
  }

  await mysqlPool.execute(
    `
      insert into songs (id, couple_room_id, added_by, title, artist, cover_url, source_type, source_url, message)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid(),
      room.id,
      userId,
      title,
      trimOrNull(input.artist),
      trimOrNull(input.coverUrl),
      sourceType,
      sourceUrl,
      trimOrNull(input.message)
    ]
  );
  await notifyPartner(room.id, userId, "SONG_ADDED", "Có bài hát mới trong phòng", title);

  return listSongs(userId);
};

export const updateSong = async (userId: string, songId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    `
      update songs set
        title = coalesce(?, title),
        artist = ?,
        cover_url = ?,
        source_url = coalesce(?, source_url),
        message = ?
      where id = ? and couple_room_id = ?
    `,
    [
      trimOrNull(input.title),
      trimOrNull(input.artist),
      trimOrNull(input.coverUrl),
      trimOrNull(input.sourceUrl),
      trimOrNull(input.message),
      songId,
      room.id
    ]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy bài hát trong phòng của bạn");
  }

  return listSongs(userId);
};

export const removeSong = async (userId: string, songId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from songs where id = ? and couple_room_id = ?",
    [songId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy bài hát trong phòng của bạn");
  }

  return { deleted: true };
};

export const getTodayQuestion = async () => {
  const [questions] = await mysqlPool.query<QuestionRow[]>(
    "select id, question, category from daily_questions where is_active = 1 order by created_at asc, id asc"
  );

  if (!questions.length) {
    return null;
  }

  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return mapQuestion(questions[dayNumber % questions.length]);
};

export const listRoomQuizzes = async (userId: string) => {
  const room = await requireRoom(userId);
  const [quizzes] = await mysqlPool.query<RoomQuizRow[]>(
    `
      select cq.*, u.name as creator_name, u.avatar_url as creator_avatar_url
      from couple_quizzes cq
      join users u on u.id = cq.created_by
      where cq.couple_room_id = ?
      order by cq.created_at desc
      limit 12
    `,
    [room.id]
  );

  if (!quizzes.length) {
    return [];
  }

  const quizIds = quizzes.map((quiz) => quiz.id);
  const [answers] = await mysqlPool.query<RoomQuizAnswerRow[]>(
    `
      select cqa.*, u.name as user_name, u.avatar_url
      from couple_quiz_answers cqa
      join users u on u.id = cqa.user_id
      where cqa.couple_room_id = ? and cqa.quiz_id in (?)
      order by cqa.created_at asc
    `,
    [room.id, quizIds]
  );
  const answersByQuiz = new Map<string, RoomQuizAnswerRow[]>();

  answers.forEach((answer) => {
    const group = answersByQuiz.get(answer.quiz_id) ?? [];
    group.push(answer);
    answersByQuiz.set(answer.quiz_id, group);
  });

  return quizzes.map((quiz) => mapRoomQuiz(quiz, answersByQuiz.get(quiz.id) ?? []));
};

export const listQuestionAnswers = async (userId: string) => {
  const room = await requireRoom(userId);
  const question = await getTodayQuestion();

  if (!question) {
    return { question: null, answers: [], roomQuizzes: await listRoomQuizzes(userId) };
  }

  const [answers] = await mysqlPool.query<AnswerRow[]>(
    `
      select da.*, u.name as user_name, u.avatar_url
      from daily_answers da
      join users u on u.id = da.user_id
      where da.couple_room_id = ? and da.question_id = ? and da.answer_date = curdate()
      order by da.created_at asc
    `,
    [room.id, question.id]
  );

  return {
    question,
    answers: answers.map(mapAnswer),
    roomQuizzes: await listRoomQuizzes(userId)
  };
};

export const createRoomQuiz = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const question = requireText(input.question, "Vui lòng nhập câu hỏi muốn tâm sự", 500);
  const options = [trimOrNull(input.optionA), trimOrNull(input.optionB), trimOrNull(input.optionC)].filter(Boolean);
  const quizType = options.length >= 2 ? "choice" : "open";
  const id = uuid();

  await mysqlPool.execute(
    `
      insert into couple_quizzes
        (id, couple_room_id, created_by, question, quiz_type, option_a, option_b, option_c)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [id, room.id, userId, question, quizType, options[0] ?? null, options[1] ?? null, options[2] ?? null]
  );
  await notifyPartner(room.id, userId, "QUIZ_CREATED", "Có câu hỏi tâm sự mới", question.slice(0, 160));

  return listQuestionAnswers(userId);
};

export const submitDailyAnswer = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const questionId = requireText(input.questionId, "Không tìm thấy câu hỏi hôm nay", 36);
  const answer = requireText(input.answer, "Vui lòng viết câu trả lời", 2000);

  await mysqlPool.execute(
    `
      insert into daily_answers (id, couple_room_id, question_id, user_id, answer, answer_date)
      values (?, ?, ?, ?, ?, curdate())
      on duplicate key update answer = values(answer), updated_at = now()
    `,
    [uuid(), room.id, questionId, userId, answer]
  );
  await notifyPartner(room.id, userId, "QUESTION_ANSWERED", "Người ấy vừa trả lời câu hỏi hôm nay", answer.slice(0, 120));

  return listQuestionAnswers(userId);
};

export const submitRoomQuizAnswer = async (userId: string, quizId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const answer = requireText(input.answer, "Vui lòng chọn hoặc viết câu trả lời", 2000);
  const [quizzes] = await mysqlPool.query<RoomQuizRow[]>(
    "select * from couple_quizzes where id = ? and couple_room_id = ? limit 1",
    [quizId, room.id]
  );
  const quiz = quizzes[0];

  if (!quiz) {
    throw new Error("Không tìm thấy câu hỏi trong phòng của bạn");
  }

  const validOptions = [quiz.option_a, quiz.option_b, quiz.option_c].filter(Boolean);

  if (quiz.quiz_type === "choice" && !validOptions.includes(answer)) {
    throw new Error("Câu trả lời không nằm trong lựa chọn của câu hỏi");
  }

  await mysqlPool.execute(
    `
      insert into couple_quiz_answers (id, couple_room_id, quiz_id, user_id, answer)
      values (?, ?, ?, ?, ?)
      on duplicate key update answer = values(answer), updated_at = now()
    `,
    [uuid(), room.id, quiz.id, userId, answer]
  );
  await notifyPartner(room.id, userId, "QUIZ_ANSWERED", "Người ấy vừa trả lời câu hỏi tâm sự", answer.slice(0, 120));

  return listQuestionAnswers(userId);
};

const optionKeys: QuizOptionKey[] = ["A", "B", "C", "D"];

const normalizeOptionKey = (value: unknown) => {
  const key = trimOrNull(value)?.toUpperCase();

  if (!key || !optionKeys.includes(key as QuizOptionKey)) {
    throw new Error("Vui lòng chọn đáp án đúng cho câu hỏi");
  }

  return key as QuizOptionKey;
};

const readQuizGame = async (roomId: string, gameId: string) => {
  const [games] = await mysqlPool.query<QuizGameRow[]>(
    `
      select qg.*, u.name as creator_name, u.avatar_url as creator_avatar_url
      from couple_quiz_games qg
      join users u on u.id = qg.created_by
      where qg.id = ? and qg.couple_room_id = ? and qg.status = 'active'
      limit 1
    `,
    [gameId, roomId]
  );

  if (!games[0]) {
    throw new Error("Không tìm thấy trò chơi trong phòng của bạn");
  }

  return games[0];
};

const readQuizGameQuestions = async (roomId: string, gameId: string) => {
  const [questions] = await mysqlPool.query<QuizGameQuestionRow[]>(
    `
      select *
      from couple_quiz_game_questions
      where couple_room_id = ? and game_id = ?
      order by sort_order asc, created_at asc
    `,
    [roomId, gameId]
  );

  return questions;
};

const readQuizAttempts = async (roomId: string, gameId: string) => {
  const [attempts] = await mysqlPool.query<QuizAttemptRow[]>(
    `
      select qa.*, u.name as user_name, u.avatar_url
      from couple_quiz_attempts qa
      join users u on u.id = qa.user_id
      where qa.couple_room_id = ? and qa.game_id = ?
      order by qa.completed_at desc
      limit 10
    `,
    [roomId, gameId]
  );

  return attempts;
};

export const listQuizGames = async (userId: string) => {
  const room = await requireRoom(userId);
  const [games] = await mysqlPool.query<QuizGameRow[]>(
    `
      select qg.*, u.name as creator_name, u.avatar_url as creator_avatar_url
      from couple_quiz_games qg
      join users u on u.id = qg.created_by
      where qg.couple_room_id = ? and qg.status = 'active'
      order by qg.created_at desc
      limit 12
    `,
    [room.id]
  );

  if (!games.length) {
    return [];
  }

  const gameIds = games.map((game) => game.id);
  const [questions] = await mysqlPool.query<QuizGameQuestionRow[]>(
    "select * from couple_quiz_game_questions where couple_room_id = ? and game_id in (?) order by sort_order asc",
    [room.id, gameIds]
  );
  const [attempts] = await mysqlPool.query<QuizAttemptRow[]>(
    `
      select qa.*, u.name as user_name, u.avatar_url
      from couple_quiz_attempts qa
      join users u on u.id = qa.user_id
      where qa.couple_room_id = ? and qa.game_id in (?)
      order by qa.completed_at desc
    `,
    [room.id, gameIds]
  );
  const questionsByGame = new Map<string, QuizGameQuestionRow[]>();
  const attemptsByGame = new Map<string, QuizAttemptRow[]>();

  questions.forEach((question) => {
    const group = questionsByGame.get(question.game_id) ?? [];
    group.push(question);
    questionsByGame.set(question.game_id, group);
  });
  attempts.forEach((attempt) => {
    const group = attemptsByGame.get(attempt.game_id) ?? [];
    if (group.length < 4) {
      group.push(attempt);
    }
    attemptsByGame.set(attempt.game_id, group);
  });

  return games.map((game) => mapQuizGame(game, questionsByGame.get(game.id) ?? [], attemptsByGame.get(game.id) ?? []));
};

export const createQuizGame = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng đặt tên cho trò chơi", 180);
  const meaning = trimOrNull(input.meaning);
  const rawTimeLimit = Number(input.timeLimitSeconds ?? 30);
  const timeLimitSeconds = Number.isFinite(rawTimeLimit)
    ? Math.min(120, Math.max(10, Math.round(rawTimeLimit)))
    : 30;
  const questionsInput = Array.isArray(input.questions) ? input.questions : [];

  if (!questionsInput.length) {
    throw new Error("Trò chơi cần ít nhất 1 câu hỏi");
  }

  if (questionsInput.length > 12) {
    throw new Error("Một trò chơi tối đa 12 câu hỏi");
  }

  const questions = questionsInput.map((item, index) => {
    const data = (item ?? {}) as Record<string, unknown>;
    const questionText = requireText(data.questionText, `Câu ${index + 1} chưa có nội dung`, 700);
    const optionA = requireText(data.optionA, `Câu ${index + 1} thiếu lựa chọn A`, 240);
    const optionB = requireText(data.optionB, `Câu ${index + 1} thiếu lựa chọn B`, 240);
    const optionC = trimOrNull(data.optionC);
    const optionD = trimOrNull(data.optionD);
    const correctOption = normalizeOptionKey(data.correctOption);
    const optionMap = { A: optionA, B: optionB, C: optionC, D: optionD };

    if (!optionMap[correctOption]) {
      throw new Error(`Câu ${index + 1} đang chọn đáp án đúng nhưng lựa chọn đó còn trống`);
    }

    return {
      id: uuid(),
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      sortOrder: index
    };
  });
  const gameId = uuid();
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        insert into couple_quiz_games (id, couple_room_id, created_by, title, meaning, time_limit_seconds)
        values (?, ?, ?, ?, ?, ?)
      `,
      [gameId, room.id, userId, title, meaning, timeLimitSeconds]
    );

    await Promise.all(
      questions.map((question) =>
        connection.execute(
          `
            insert into couple_quiz_game_questions
              (id, couple_room_id, game_id, question_text, option_a, option_b, option_c, option_d, correct_option, sort_order)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            question.id,
            room.id,
            gameId,
            question.questionText,
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
            question.correctOption,
            question.sortOrder
          ]
        )
      )
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await notifyPartner(room.id, userId, "QUIZ_GAME_CREATED", "Có trò chơi tâm sự mới", title);

  return getQuizGameReport(userId, gameId);
};

export const getQuizGameForPlay = async (userId: string, gameId: string) => {
  const room = await requireRoom(userId);
  const game = await readQuizGame(room.id, gameId);
  const questions = await readQuizGameQuestions(room.id, gameId);
  const attempts = await readQuizAttempts(room.id, gameId);

  return mapQuizGame(game, questions, attempts, false);
};

export const getQuizGameReport = async (userId: string, gameId: string) => {
  const room = await requireRoom(userId);
  const game = await readQuizGame(room.id, gameId);
  const questions = await readQuizGameQuestions(room.id, gameId);
  const attempts = await readQuizAttempts(room.id, gameId);

  return mapQuizGame(game, questions, attempts, true);
};

export const submitQuizGameAttempt = async (userId: string, gameId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const game = await readQuizGame(room.id, gameId);
  const questions = await readQuizGameQuestions(room.id, gameId);
  const answerInput = Array.isArray(input.answers) ? input.answers : [];
  const durationSeconds = Math.max(0, Math.round(Number(input.durationSeconds ?? 0) || 0));
  const answersByQuestion = new Map<string, QuizOptionKey>();

  answerInput.forEach((item) => {
    const data = (item ?? {}) as Record<string, unknown>;
    const questionId = trimOrNull(data.questionId);
    if (questionId) {
      answersByQuestion.set(questionId, normalizeOptionKey(data.selectedOption));
    }
  });

  const scoredAnswers = questions.map((question) => {
    const selectedOption = answersByQuestion.get(question.id);

    return {
      question,
      selectedOption: selectedOption ?? "A",
      isCorrect: selectedOption ? selectedOption === question.correct_option : false
    };
  });
  const score = scoredAnswers.filter((answer) => answer.isCorrect).length;
  const attemptId = uuid();
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        insert into couple_quiz_attempts
          (id, couple_room_id, game_id, user_id, score, total_questions, duration_seconds)
        values (?, ?, ?, ?, ?, ?, ?)
      `,
      [attemptId, room.id, game.id, userId, score, questions.length, durationSeconds]
    );
    await Promise.all(
      scoredAnswers.map((answer) =>
        connection.execute(
          `
            insert into couple_quiz_attempt_answers
              (id, couple_room_id, attempt_id, question_id, selected_option, is_correct)
            values (?, ?, ?, ?, ?, ?)
          `,
          [uuid(), room.id, attemptId, answer.question.id, answer.selectedOption, answer.isCorrect ? 1 : 0]
        )
      )
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await notifyPartner(
    room.id,
    userId,
    "QUIZ_GAME_FINISHED",
    "Người ấy vừa hoàn thành trò chơi tâm sự",
    `${game.title}: ${score}/${questions.length} điểm`
  );

  return getQuizGameReport(userId, gameId);
};

export const getTodayMoods = async (userId: string) => {
  const room = await requireRoom(userId);
  const [rows] = await mysqlPool.query<MoodRow[]>(
    `
      select m.*, u.name as user_name, u.avatar_url
      from moods m
      join users u on u.id = m.user_id
      where m.couple_room_id = ? and m.mood_date = curdate()
      order by m.created_at asc
    `,
    [room.id]
  );

  return rows.map(mapMood);
};

export const setTodayMood = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const mood = requireText(input.mood, "Hôm nay cậu thế nào?", 80);

  await mysqlPool.execute(
    `
      insert into moods (id, couple_room_id, user_id, mood, note, mood_date)
      values (?, ?, ?, ?, ?, curdate())
      on duplicate key update mood = values(mood), note = values(note), updated_at = now()
    `,
    [uuid(), room.id, userId, mood, trimOrNull(input.note)]
  );
  await notifyPartner(room.id, userId, "MOOD_UPDATED", "Mood hôm nay vừa được cập nhật", mood);

  return getTodayMoods(userId);
};

export const listAlbums = async (userId: string) => {
  const room = await requireRoom(userId);
  const [albums] = await mysqlPool.query<AlbumRow[]>(
    `
      select a.*, u.name as creator_name
      from albums a
      join users u on u.id = a.created_by
      where a.couple_room_id = ?
      order by a.created_at desc
    `,
    [room.id]
  );
  const [photos] = await mysqlPool.query<PhotoRow[]>(
    `
      select p.*, u.name as uploader_name
      from album_photos p
      join users u on u.id = p.uploaded_by
      where p.couple_room_id = ?
      order by p.created_at desc
    `,
    [room.id]
  );

  return albums.map((album) => mapAlbum(album, photos.filter((photo) => photo.album_id === album.id)));
};

export const createAlbum = async (userId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const title = requireText(input.title, "Vui lòng đặt tên album");

  await mysqlPool.execute(
    `
      insert into albums (id, couple_room_id, title, description, created_by)
      values (?, ?, ?, ?, ?)
    `,
    [uuid(), room.id, title, trimOrNull(input.description), userId]
  );

  return listAlbums(userId);
};

export const addAlbumPhoto = async (userId: string, albumId: string, input: Record<string, unknown>) => {
  const room = await requireRoom(userId);
  const allowed = await ensureResourceBelongsToRoom("albums", albumId, room.id);

  if (!allowed) {
    throw new Error("Không tìm thấy album trong phòng của bạn");
  }

  const imageUrl = await resolveImageUrl(userId, input);

  if (!imageUrl) {
    throw new Error("Vui lòng chọn ảnh hoặc nhập link ảnh");
  }

  await mysqlPool.execute(
    `
      insert into album_photos (id, couple_room_id, album_id, uploaded_by, image_url, caption)
      values (?, ?, ?, ?, ?, ?)
    `,
    [uuid(), room.id, albumId, userId, imageUrl, trimOrNull(input.caption)]
  );
  await notifyPartner(room.id, userId, "PHOTO_ADDED", "Album vừa có ảnh mới", trimOrNull(input.caption));

  return listAlbums(userId);
};

export const deleteAlbumPhoto = async (userId: string, photoId: string) => {
  const room = await requireRoom(userId);
  const [result] = await mysqlPool.execute<ResultSetHeader>(
    "delete from album_photos where id = ? and couple_room_id = ?",
    [photoId, room.id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy ảnh trong phòng của bạn");
  }

  return { deleted: true };
};

export const listNotifications = async (userId: string) => {
  const room = await requireRoom(userId);
  await pushDueCalendarNotifications(room.id);
  const [rows] = await mysqlPool.query<NotificationRow[]>(
    `
      select *
      from notifications
      where couple_room_id = ? and user_id = ?
      order by created_at desc
      limit 50
    `,
    [room.id, userId]
  );
  const [counts] = await mysqlPool.query<CountRow[]>(
    "select count(*) as count from notifications where couple_room_id = ? and user_id = ? and is_read = 0",
    [room.id, userId]
  );

  return {
    unreadCount: Number(counts[0]?.count ?? 0),
    notifications: rows.map(mapNotification)
  };
};

export const markNotificationRead = async (userId: string, notificationId?: string) => {
  const room = await requireRoom(userId);

  if (notificationId) {
    await mysqlPool.execute(
      "update notifications set is_read = 1 where id = ? and user_id = ? and couple_room_id = ?",
      [notificationId, userId, room.id]
    );
  } else {
    await mysqlPool.execute(
      "update notifications set is_read = 1 where user_id = ? and couple_room_id = ?",
      [userId, room.id]
    );
  }

  return listNotifications(userId);
};
