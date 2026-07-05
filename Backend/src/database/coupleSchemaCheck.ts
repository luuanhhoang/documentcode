import type { RowDataPacket } from "mysql2/promise";
import { mysqlPool } from "./mysqlPool.js";

const requiredSchema: Record<string, string[]> = {
  users: [
    "id",
    "name",
    "email",
    "password_hash",
    "avatar_url",
    "nickname",
    "birthday",
    "gender",
    "bio",
    "interests",
    "default_mood",
    "status",
    "last_login_at",
    "last_seen_at",
    "created_at",
    "updated_at"
  ],
  password_resets: ["email", "otp", "expires_at", "created_at"],
  couple_rooms: [
    "id",
    "room_name",
    "invite_code",
    "owner_user_id",
    "anniversary_date",
    "couple_avatar_url",
    "room_bio",
    "theme",
    "status",
    "created_at",
    "updated_at"
  ],
  couple_members: ["id", "couple_room_id", "user_id", "role", "nickname", "joined_at"],
  memories: [
    "id",
    "couple_room_id",
    "created_by",
    "title",
    "content",
    "memory_date",
    "image_url",
    "place_name",
    "created_at",
    "updated_at"
  ],
  private_letters: [
    "id",
    "couple_room_id",
    "sender_id",
    "receiver_id",
    "title",
    "content",
    "mood",
    "unlock_at",
    "is_secret",
    "pinned",
    "envelope",
    "paper",
    "font",
    "opened_at",
    "created_at",
    "updated_at"
  ],
  bucket_items: ["id", "couple_room_id", "created_by", "title", "note", "is_done", "done_at", "created_at", "updated_at"],
  couple_games: [
    "couple_room_id",
    "board",
    "turn",
    "x_user_id",
    "o_user_id",
    "x_rps",
    "o_rps",
    "first_symbol",
    "status",
    "winner",
    "invited_by",
    "x_score",
    "o_score",
    "draws",
    "round",
    "updated_by",
    "updated_at"
  ],
  wallet_entries: ["id", "couple_room_id", "created_by", "category", "title", "amount", "note", "spent_at", "created_at", "updated_at"],
  challenges: ["id", "couple_room_id", "created_by", "title", "target_days", "created_at"],
  challenge_checkins: ["id", "challenge_id", "couple_room_id", "user_id", "check_date", "created_at"],
  couple_tasks: [
    "id",
    "couple_room_id",
    "created_by",
    "title",
    "description",
    "category",
    "status",
    "completed_at",
    "created_at",
    "updated_at"
  ],
  calendar_events: [
    "id",
    "couple_room_id",
    "created_by",
    "title",
    "event_type",
    "description",
    "starts_at",
    "reminder_sent_at",
    "created_at",
    "updated_at"
  ],
  songs: [
    "id",
    "couple_room_id",
    "added_by",
    "title",
    "artist",
    "cover_url",
    "source_type",
    "source_url",
    "message",
    "created_at",
    "updated_at"
  ],
  daily_questions: ["id", "question", "category", "is_active", "created_at"],
  daily_answers: ["id", "couple_room_id", "question_id", "user_id", "answer", "answer_date", "created_at", "updated_at"],
  couple_quizzes: [
    "id",
    "couple_room_id",
    "created_by",
    "question",
    "quiz_type",
    "option_a",
    "option_b",
    "option_c",
    "created_at",
    "updated_at"
  ],
  couple_quiz_answers: ["id", "couple_room_id", "quiz_id", "user_id", "answer", "created_at", "updated_at"],
  couple_quiz_games: [
    "id",
    "couple_room_id",
    "created_by",
    "title",
    "meaning",
    "time_limit_seconds",
    "status",
    "created_at",
    "updated_at"
  ],
  couple_quiz_game_questions: [
    "id",
    "couple_room_id",
    "game_id",
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "sort_order",
    "created_at"
  ],
  couple_quiz_attempts: [
    "id",
    "couple_room_id",
    "game_id",
    "user_id",
    "score",
    "total_questions",
    "duration_seconds",
    "started_at",
    "completed_at"
  ],
  couple_quiz_attempt_answers: [
    "id",
    "couple_room_id",
    "attempt_id",
    "question_id",
    "selected_option",
    "is_correct",
    "answered_at"
  ],
  moods: ["id", "couple_room_id", "user_id", "mood", "note", "mood_date", "created_at", "updated_at"],
  albums: ["id", "couple_room_id", "title", "description", "created_by", "created_at", "updated_at"],
  album_photos: ["id", "couple_room_id", "album_id", "uploaded_by", "image_url", "caption", "created_at"],
  notifications: ["id", "couple_room_id", "user_id", "type", "title", "content", "is_read", "created_at"]
};

const requiredTriggers = [
  "trg_couple_members_before_insert",
  "trg_couple_members_after_insert",
  "trg_couple_members_after_delete"
];

type TableRow = RowDataPacket & { table_name: string };
type ColumnRow = RowDataPacket & { table_name: string; column_name: string };
type TriggerRow = RowDataPacket & { trigger_name: string };
type CountRow = RowDataPacket & { count: number };

const placeholders = (items: unknown[]) => items.map(() => "?").join(",");

export const validateCoupleSchemaReady = async () => {
  await mysqlPool.query("select 1");

  const requiredTables = Object.keys(requiredSchema);
  const [tables] = await mysqlPool.query<TableRow[]>(
    `
      select table_name
      from information_schema.tables
      where table_schema = database()
        and table_name in (${placeholders(requiredTables)})
    `,
    requiredTables
  );

  const existingTables = new Set(tables.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !existingTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(`Missing database tables: ${missingTables.join(", ")}`);
  }

  const [columns] = await mysqlPool.query<ColumnRow[]>(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = database()
        and table_name in (${placeholders(requiredTables)})
    `,
    requiredTables
  );

  const columnsByTable = new Map<string, Set<string>>();
  for (const column of columns) {
    const tableColumns = columnsByTable.get(column.table_name) ?? new Set<string>();
    tableColumns.add(column.column_name);
    columnsByTable.set(column.table_name, tableColumns);
  }

  const missingColumns = Object.entries(requiredSchema).flatMap(([table, tableColumns]) => {
    const existingColumns = columnsByTable.get(table) ?? new Set<string>();
    return tableColumns
      .filter((column) => !existingColumns.has(column))
      .map((column) => `${table}.${column}`);
  });

  if (missingColumns.length > 0) {
    throw new Error(`Missing database columns: ${missingColumns.join(", ")}`);
  }

  const [triggers] = await mysqlPool.query<TriggerRow[]>(
    `
      select trigger_name
      from information_schema.triggers
      where trigger_schema = database()
        and trigger_name in (${placeholders(requiredTriggers)})
    `,
    requiredTriggers
  );

  const existingTriggers = new Set(triggers.map((row) => row.trigger_name));
  const missingTriggers = requiredTriggers.filter((trigger) => !existingTriggers.has(trigger));

  if (missingTriggers.length > 0) {
    throw new Error(`Missing database triggers: ${missingTriggers.join(", ")}`);
  }

  const [questionRows] = await mysqlPool.query<CountRow[]>(
    "select count(*) as count from daily_questions where is_active = 1"
  );

  if (Number(questionRows[0]?.count ?? 0) === 0) {
    throw new Error("Missing active daily questions. Re-import database/couple_world.sql.");
  }
};
