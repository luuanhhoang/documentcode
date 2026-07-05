CREATE DATABASE IF NOT EXISTS couple_world
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE couple_world;

SET NAMES utf8mb4;

DROP TRIGGER IF EXISTS trg_couple_members_before_insert;
DROP TRIGGER IF EXISTS trg_couple_members_after_insert;
DROP TRIGGER IF EXISTS trg_couple_members_after_delete;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  nickname VARCHAR(120) NULL,
  birthday DATE NULL,
  gender VARCHAR(40) NULL,
  bio VARCHAR(700) NULL,
  interests TEXT NULL,
  default_mood VARCHAR(120) NULL,
  status ENUM('ACTIVE', 'BLOCKED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME NULL,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  email VARCHAR(190) PRIMARY KEY,
  otp VARCHAR(16) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_password_resets_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_rooms (
  id CHAR(36) PRIMARY KEY,
  room_name VARCHAR(160) NOT NULL,
  invite_code VARCHAR(32) NOT NULL,
  owner_user_id CHAR(36) NOT NULL,
  anniversary_date DATE NULL,
  couple_avatar_url VARCHAR(500) NULL,
  room_bio VARCHAR(700) NULL,
  theme VARCHAR(40) NOT NULL DEFAULT 'violet',
  status ENUM('waiting', 'paired') NOT NULL DEFAULT 'waiting',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_couple_rooms_invite_code (invite_code),
  KEY idx_couple_rooms_owner (owner_user_id),
  KEY idx_couple_rooms_status (status),
  CONSTRAINT fk_couple_rooms_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_members (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner', 'partner') NOT NULL DEFAULT 'partner',
  nickname VARCHAR(120) NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_couple_members_room_user (couple_room_id, user_id),
  UNIQUE KEY uq_couple_members_active_user (user_id),
  KEY idx_couple_members_room (couple_room_id),
  CONSTRAINT fk_couple_members_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_members_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memories (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT NULL,
  memory_date DATE NOT NULL,
  image_url VARCHAR(500) NULL,
  place_name VARCHAR(220) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_memories_room_date (couple_room_id, memory_date DESC),
  KEY idx_memories_room_place (couple_room_id, place_name),
  KEY idx_memories_created_by (created_by),
  CONSTRAINT fk_memories_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_memories_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS private_letters (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  receiver_id CHAR(36) NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  mood VARCHAR(80) NULL,
  unlock_at DATETIME NULL,
  is_secret TINYINT(1) NOT NULL DEFAULT 0,
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  envelope VARCHAR(40) NULL,
  paper VARCHAR(40) NULL,
  font VARCHAR(40) NULL,
  opened_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_private_letters_room_created (couple_room_id, created_at DESC),
  KEY idx_private_letters_sender (sender_id),
  KEY idx_private_letters_receiver (receiver_id),
  CONSTRAINT fk_private_letters_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_private_letters_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_private_letters_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bucket_items (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(220) NOT NULL,
  note VARCHAR(500) NULL,
  is_done TINYINT(1) NOT NULL DEFAULT 0,
  done_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bucket_items_room (couple_room_id, is_done, created_at),
  CONSTRAINT fk_bucket_items_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bucket_items_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mini-game cờ caro realtime (một ván / phòng)
CREATE TABLE IF NOT EXISTS couple_games (
  couple_room_id CHAR(36) PRIMARY KEY,
  board VARCHAR(9) NOT NULL DEFAULT '_________',
  turn CHAR(1) NOT NULL DEFAULT 'X',
  x_user_id CHAR(36) NULL,
  o_user_id CHAR(36) NULL,
  x_rps CHAR(1) NULL,
  o_rps CHAR(1) NULL,
  first_symbol CHAR(1) NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'idle',
  winner CHAR(1) NULL,
  invited_by CHAR(36) NULL,
  x_score INT NOT NULL DEFAULT 0,
  o_score INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  round INT NOT NULL DEFAULT 1,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_couple_games_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_entries (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Khác',
  title VARCHAR(180) NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  note VARCHAR(300) NULL,
  spent_at DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wallet_entries_room (couple_room_id, spent_at),
  CONSTRAINT fk_wallet_entries_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_wallet_entries_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenges (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  target_days INT NOT NULL DEFAULT 30,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_challenges_room (couple_room_id, created_at),
  CONSTRAINT fk_challenges_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_challenges_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenge_checkins (
  id CHAR(36) PRIMARY KEY,
  challenge_id CHAR(36) NOT NULL,
  couple_room_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  check_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_challenge_checkins_day (challenge_id, check_date),
  KEY idx_challenge_checkins_room (couple_room_id),
  CONSTRAINT fk_challenge_checkins_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_challenge_checkins_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_challenge_checkins_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_tasks (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NULL,
  status ENUM('todo', 'doing', 'done') NOT NULL DEFAULT 'todo',
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_couple_tasks_room_status (couple_room_id, status, created_at DESC),
  KEY idx_couple_tasks_created_by (created_by),
  CONSTRAINT fk_couple_tasks_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_tasks_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calendar_events (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  event_type ENUM('date', 'camping', 'picnic', 'movie', 'dinner', 'travel', 'birthday', 'anniversary', 'other') NOT NULL DEFAULT 'date',
  description TEXT NULL,
  starts_at DATETIME NOT NULL,
  reminder_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_calendar_events_room_starts (couple_room_id, starts_at),
  KEY idx_calendar_events_due (reminder_sent_at, starts_at),
  CONSTRAINT fk_calendar_events_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_calendar_events_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS songs (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  added_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  artist VARCHAR(160) NULL,
  cover_url VARCHAR(500) NULL,
  source_type ENUM('soundcloud', 'youtube', 'spotify', 'custom') NOT NULL DEFAULT 'custom',
  source_url VARCHAR(800) NOT NULL,
  message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_songs_room_created (couple_room_id, created_at DESC),
  KEY idx_songs_added_by (added_by),
  CONSTRAINT fk_songs_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_songs_added_by
    FOREIGN KEY (added_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_questions (
  id CHAR(36) PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  category VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daily_questions_active (is_active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_answers (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  answer TEXT NOT NULL,
  answer_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_daily_answers_once (couple_room_id, question_id, user_id, answer_date),
  KEY idx_daily_answers_room_date (couple_room_id, answer_date DESC),
  CONSTRAINT fk_daily_answers_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_daily_answers_question
    FOREIGN KEY (question_id) REFERENCES daily_questions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_daily_answers_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quizzes (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  question VARCHAR(500) NOT NULL,
  quiz_type ENUM('open', 'choice') NOT NULL DEFAULT 'open',
  option_a VARCHAR(220) NULL,
  option_b VARCHAR(220) NULL,
  option_c VARCHAR(220) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_couple_quizzes_room_created (couple_room_id, created_at DESC),
  CONSTRAINT fk_couple_quizzes_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quizzes_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quiz_answers (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  quiz_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  answer TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_couple_quiz_answers_once (couple_room_id, quiz_id, user_id),
  KEY idx_couple_quiz_answers_quiz (quiz_id, created_at),
  CONSTRAINT fk_couple_quiz_answers_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_answers_quiz
    FOREIGN KEY (quiz_id) REFERENCES couple_quizzes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_answers_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quiz_games (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  meaning VARCHAR(700) NULL,
  time_limit_seconds INT NOT NULL DEFAULT 30,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_couple_quiz_games_room_created (couple_room_id, created_at DESC),
  CONSTRAINT fk_couple_quiz_games_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_games_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quiz_game_questions (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  question_text VARCHAR(700) NOT NULL,
  option_a VARCHAR(240) NOT NULL,
  option_b VARCHAR(240) NOT NULL,
  option_c VARCHAR(240) NULL,
  option_d VARCHAR(240) NULL,
  correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_couple_quiz_game_questions_game (game_id, sort_order),
  CONSTRAINT fk_couple_quiz_game_questions_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_game_questions_game
    FOREIGN KEY (game_id) REFERENCES couple_quiz_games(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quiz_attempts (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_couple_quiz_attempts_game_completed (game_id, completed_at DESC),
  KEY idx_couple_quiz_attempts_user_completed (user_id, completed_at DESC),
  CONSTRAINT fk_couple_quiz_attempts_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_attempts_game
    FOREIGN KEY (game_id) REFERENCES couple_quiz_games(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS couple_quiz_attempt_answers (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  attempt_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  selected_option ENUM('A', 'B', 'C', 'D') NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_couple_quiz_attempt_answers_attempt (attempt_id),
  CONSTRAINT fk_couple_quiz_attempt_answers_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_attempt_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES couple_quiz_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_couple_quiz_attempt_answers_question
    FOREIGN KEY (question_id) REFERENCES couple_quiz_game_questions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moods (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  mood VARCHAR(80) NOT NULL,
  note VARCHAR(500) NULL,
  mood_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_moods_once (couple_room_id, user_id, mood_date),
  KEY idx_moods_room_date (couple_room_id, mood_date DESC),
  CONSTRAINT fk_moods_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_moods_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS albums (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_albums_room_created (couple_room_id, created_at DESC),
  CONSTRAINT fk_albums_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_albums_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS album_photos (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  album_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_album_photos_room_created (couple_room_id, created_at DESC),
  KEY idx_album_photos_album (album_id, created_at DESC),
  CONSTRAINT fk_album_photos_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_album_photos_album
    FOREIGN KEY (album_id) REFERENCES albums(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_album_photos_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  couple_room_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content VARCHAR(700) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user_read (user_id, is_read, created_at DESC),
  KEY idx_notifications_room_created (couple_room_id, created_at DESC),
  CONSTRAINT fk_notifications_room
    FOREIGN KEY (couple_room_id) REFERENCES couple_rooms(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE TRIGGER trg_couple_members_before_insert
BEFORE INSERT ON couple_members
FOR EACH ROW
BEGIN
  DECLARE member_count INT DEFAULT 0;

  SELECT COUNT(*)
    INTO member_count
    FROM couple_members
    WHERE couple_room_id = NEW.couple_room_id;

  IF member_count >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Couple room already has two members';
  END IF;
END$$

CREATE TRIGGER trg_couple_members_after_insert
AFTER INSERT ON couple_members
FOR EACH ROW
BEGIN
  UPDATE couple_rooms
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM couple_members WHERE couple_room_id = NEW.couple_room_id) >= 2
      THEN 'paired'
      ELSE 'waiting'
    END
    WHERE id = NEW.couple_room_id;
END$$

CREATE TRIGGER trg_couple_members_after_delete
AFTER DELETE ON couple_members
FOR EACH ROW
BEGIN
  UPDATE couple_rooms
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM couple_members WHERE couple_room_id = OLD.couple_room_id) >= 2
      THEN 'paired'
      ELSE 'waiting'
    END
    WHERE id = OLD.couple_room_id;
END$$

DELIMITER ;

INSERT IGNORE INTO daily_questions (id, question, category) VALUES
  (UUID(), 'Hôm nay có điều gì nhỏ xíu làm cậu thấy được yêu thương không?', 'warm'),
  (UUID(), 'Nếu tối nay hai đứa được ở cùng một nơi, mình sẽ làm gì đầu tiên?', 'date'),
  (UUID(), 'Một câu nói nào của tớ khiến cậu nhớ lâu nhất?', 'memory'),
  (UUID(), 'Có điều gì cậu muốn hai đứa thử cùng nhau trong tuần này?', 'plan'),
  (UUID(), 'Kỷ niệm nào của tụi mình làm cậu muốn lưu lại mãi?', 'memory'),
  (UUID(), 'Hôm nay cậu cần tớ ở cạnh theo cách nào?', 'care'),
  (UUID(), 'Bài hát nào hợp với tâm trạng của cậu hôm nay?', 'music'),
  (UUID(), 'Nếu đặt tên cho ngày hôm nay của tụi mình, cậu sẽ đặt là gì?', 'playful');
