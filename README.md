# PROJECT_ANALYSIS - Cosmic Love

Ghi chú phạm vi: phân tích dựa trên source thật trong `Backend/src`, `Frontend/src`, `database/couple_world.sql`, file cấu hình và hướng dẫn chạy. Bỏ qua thư mục sinh ra khi build/cài đặt như `node_modules`, `Backend/dist`, `Frontend/.next`. Dự án chưa thấy module quản trị riêng; frontend có type `ADMIN` trong `AuthUser` nhưng backend không có route admin.

## 1. Tổng quan dự án

`Cosmic Love` là ứng dụng web riêng tư cho cặp đôi. Người dùng đăng ký/đăng nhập, tạo hoặc tham gia một phòng riêng bằng mã mời, sau đó cùng lưu kỷ niệm, thư/lời nhắn, lịch hẹn, playlist, việc chung, mong ước, ví chi tiêu, thử thách, mood hằng ngày, album ảnh, quiz tâm sự và game cờ caro.

Kiến trúc chính:

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Backend | Express + TypeScript + MySQL | Cung cấp REST API, xác thực, xử lý nghiệp vụ, truy vấn MySQL |
| Frontend | Next.js + React + TypeScript | Giao diện người dùng, route auth/dashboard/quiz, gọi API |
| Database | MySQL | Lưu user, phòng, dữ liệu cặp đôi, notification, game, quiz |
| Deploy | Nginx/PM2/Vercel/Windows BAT | Build, chạy production, proxy `/api` |

Định dạng response API chung: `Backend/src/utils/apiResponse.ts:3-16` trả `{ success, message, data }`.

## 2. Cấu trúc thư mục

| Đường dẫn | Vai trò |
|---|---|
| `Backend/src/app.ts` | Tạo Express app, cấu hình CORS, JSON body, mount `/api`, notFound, errorHandler |
| `Backend/src/server.ts` | Kiểm tra schema MySQL trước khi chạy server, lắng nghe port, graceful shutdown |
| `Backend/src/config/env.ts` | Đọc `.env`, cấu hình app URL, CORS, upload dir, MySQL |
| `Backend/src/routes` | Khai báo endpoint API: auth, profile, couple, media, health |
| `Backend/src/controllers` | Nhận request, gọi service, trả response |
| `Backend/src/services` | Logic chính: auth, profile, couple room, uploads, token, email |
| `Backend/src/middlewares` | Xác thực token, rate limit, kiểm tra phòng, xử lý lỗi |
| `Backend/src/database` | Tạo pool MySQL và kiểm tra schema bắt buộc |
| `Frontend/src/app` | Next.js App Router: auth pages, dashboard pages, quiz route, layout |
| `Frontend/src/features` | Component nghiệp vụ lớn: auth, profile, couple world, game, quiz |
| `Frontend/src/components` | Component UI/layout/modal/notification/prompt |
| `Frontend/src/lib` | API client, auth client, helper avatar, className merge |
| `Frontend/public` | Ảnh, icon PWA, asset game kéo/búa/bao |
| `database/couple_world.sql` | Schema MySQL đầy đủ, foreign key, trigger, câu hỏi mặc định |
| `deploy` | Cấu hình Nginx và script build/start Windows VPS |
| `setup.bat`, `run.bat`, `rebuild.bat` | Script cài dependency, build, chạy production, rebuild frontend |
| `HUONG_DAN_CHAY_DU_AN.md` | Hướng dẫn import database, cấu hình env, deploy |
| `index.html` | File HTML rời ở root, không thấy được Next.js import/sử dụng |

## 3. Danh sách chức năng chính

| Chức năng | Dùng để làm gì | Backend liên quan | Frontend liên quan | Bảng DB | API chính |
|---|---|---|---|---|---|
| Health check | Kiểm tra backend sống | `healthRoutes.ts`, `healthController.ts` | Script `run.bat` gọi health | Không | `GET /api/health` |
| Đăng ký, đăng nhập, phiên đăng nhập | Tạo tài khoản, đăng nhập, lấy user hiện tại, refresh, logout | `authRoutes.ts`, `authController.ts`, `coupleAuthService.ts`, `tokenService.ts` | `AuthPage.tsx`, `AuthProvider.tsx`, `auth-client.ts` | `users` | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/refresh-token`, `/auth/logout` |
| Quên/đặt lại mật khẩu OTP | Gửi OTP, kiểm tra OTP, đổi mật khẩu | `authController.ts`, `coupleAuthService.ts`, `emailService.ts` | `ForgotPasswordFlow.tsx`, `AuthPage.tsx`, `auth-client.ts` | `users`, `password_resets` | `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` |
| Hồ sơ cá nhân/avatar | Xem/sửa tên, biệt danh, sinh nhật, bio, avatar | `profileRoutes.ts`, `profileService.ts`, `uploadService.ts` | `ProfilePage.tsx` | `users`, `couple_rooms`, `couple_members` | `/profile/me`, `/profile/avatar` |
| Phòng cặp đôi | Tạo phòng, tham gia bằng mã, cập nhật tên/phông nền/avatar phòng | `coupleRoutes.ts`, `coupleController.ts`, `coupleService.ts` | `CoupleWorldPage.tsx`, `DashboardShell.tsx` | `couple_rooms`, `couple_members`, `albums`, `notifications` | `/room`, `/room/join`, `/room/avatar`, `/uploads/couple-avatar` |
| Dashboard/tổng quan | Hiển thị dữ liệu tổng hợp phòng | `getSummary`, `getStats` | `CoupleWorldPage.tsx` mode `home` | nhiều bảng | `/couple/summary`, `/couple/stats` |
| Mood hôm nay | Mỗi user lưu mood/ngắn note trong ngày | `setTodayMood`, `getTodayMoods` | `CoupleWorldPage.tsx` | `moods` | `/moods/today` |
| Kỷ niệm | Lưu ảnh/link/địa điểm/nội dung kỷ niệm | `list/create/update/deleteMemory` | `CoupleWorldPage.tsx` mode `memories` | `memories`, `notifications` | `/memories` |
| Thư/lời nhắn | Gửi thư, thư bí mật, đánh dấu đã mở, ghim love note | `list/create/update/delete/open/pinLetter` | `CoupleWorldPage.tsx`, `LetterArrivalPrompt.tsx`, `LetterReader.tsx` | `private_letters`, `notifications` | `/letters`, `/love-notes` |
| Việc chung/love goals | Tạo, cập nhật, hoàn thành, xóa việc chung | `list/create/update/deleteTask` | `CoupleWorldPage.tsx` mode `tasks` | `couple_tasks`, `notifications` | `/tasks`, `/love-goals` |
| Bucket list | Danh sách mong ước, đánh dấu hoàn thành | `list/create/toggle/deleteBucket` | `CoupleWorldPage.tsx` mode `bucket` | `bucket_items`, `notifications` | `/bucket-list` |
| Ví chung | Ghi khoản chi, thống kê tổng theo mục/người, xóa | `list/create/deleteWallet` | `CoupleWorldPage.tsx` mode `wallet` | `wallet_entries`, `notifications` | `/wallet` |
| Thử thách | Tạo thử thách số ngày, check-in/bỏ check-in, xóa | `list/create/checkin/deleteChallenge` | `CoupleWorldPage.tsx` mode `challenges` | `challenges`, `challenge_checkins`, `notifications` | `/challenges` |
| Lịch hẹn | Tạo/sửa/xóa lịch, sinh thông báo khi đến hạn | `list/create/update/deleteCalendarEvent`, `pushDueCalendarNotifications` | `CoupleWorldPage.tsx`, `CoupleCalendarBoard.tsx` | `calendar_events`, `notifications` | `/calendar-events` |
| Playlist nhạc | Gửi link YouTube/SoundCloud/Spotify/custom | `list/add/update/removeSong` | `CoupleWorldPage.tsx`, `RoomMusic.tsx` | `songs`, `notifications` | `/music` |
| Câu hỏi hằng ngày | Lấy câu hỏi theo ngày, lưu câu trả lời | `getTodayQuestion`, `listQuestionAnswers`, `submitDailyAnswer` | `CoupleWorldPage.tsx` mode `questions` | `daily_questions`, `daily_answers`, `notifications` | `/questions/today`, `/questions/answers` |
| Câu hỏi tâm sự trong phòng | Backend hỗ trợ tạo/trả lời câu hỏi custom | `createRoomQuiz`, `submitRoomQuizAnswer` | Chưa thấy frontend gọi `POST /questions` trực tiếp | `couple_quizzes`, `couple_quiz_answers` | `/questions`, `/questions/:quizId/answers` |
| Quiz game | Tạo bộ câu hỏi trắc nghiệm, chơi có timer, lưu điểm | `list/create/get/report/submitQuizGame` | `CoupleWorldPage.tsx`, `CoupleQuizPlayPage.tsx` | `couple_quiz_games`, `couple_quiz_game_questions`, `couple_quiz_attempts`, `couple_quiz_attempt_answers` | `/quiz-games` |
| Album ảnh | Tạo album, thêm ảnh base64/link, xóa ảnh | `list/create/addPhoto/deletePhoto` | `CoupleWorldPage.tsx` mode `album` | `albums`, `album_photos`, `notifications` | `/albums` |
| Thông báo | Hiển thị thông báo, đánh dấu đã đọc | `listNotifications`, `markNotificationRead` | `NotificationBell.tsx` | `notifications` | `/notifications` |
| Game cờ caro | Mời chơi, chấp nhận, oẳn tù tì, đánh cờ, đầu hàng, điểm | `getGame`, `makeGameMove`, `inviteGame`, `acceptGame`, `playRps`, `surrenderGame` | `CoupleGamePage.tsx`, `GameInvitePrompt.tsx` | `couple_games`, `couple_members`, `users` | `/game/*` |
| Upload/media | Upload avatar, ảnh phòng, ảnh kỷ niệm/album, trả file media | `uploadService.ts`, `coupleUploadService.ts`, `mediaRoutes.ts` | `ProfilePage.tsx`, `CoupleWorldPage.tsx` | `users`, `couple_rooms`, `memories`, `album_photos` | `/uploads/*`, `/media/*` |

## 4. Phân tích chi tiết từng chức năng

### Health check

Mô tả ngắn: endpoint kiểm tra backend đang chạy.

| Loại | Chi tiết |
|---|---|
| Backend | `Backend/src/routes/healthRoutes.ts:6`, `Backend/src/controllers/healthController.ts:3-9` |
| Frontend/script | `run.bat` gọi `http://127.0.0.1:%PORT%/api/health` trước khi start frontend |
| Database | Không dùng |
| API | `GET /api/health`, response `{ status, service, uptime }` |

Luồng hoạt động: script hoặc trình duyệt gọi health API, backend trả trạng thái `ok`.

### Đăng ký, đăng nhập, phiên đăng nhập

Mô tả ngắn: tạo tài khoản, đăng nhập bằng email/mật khẩu, tạo access token, lưu cookie HttpOnly và token localStorage, lấy user hiện tại.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/authRoutes.ts:22-28` | Khai báo register/login/me/logout/refresh/offline/onboarding |
| Controller | `Backend/src/controllers/authController.ts:38-150` | Validate input, gọi service, set/clear cookie, cập nhật `last_seen_at` |
| Service | `Backend/src/services/coupleAuthService.ts:59-133` | Tìm user, đăng ký, kiểm tra mật khẩu, cập nhật `last_login_at` |
| Token | `Backend/src/services/tokenService.ts:30-108` | Tạo/verify JWT HMAC-SHA256, serialize cookie |
| Middleware | `Backend/src/middlewares/auth.ts:13-29` | Đọc Bearer/cookie, set `req.userId`, cập nhật online |
| Frontend | `Frontend/src/lib/auth-client.ts:107-246` | Gọi API auth, lưu token, refresh khi gặp 401 |
| Frontend | `Frontend/src/providers/AuthProvider.tsx:52-146` | Quản lý trạng thái guest/authenticated, login/register/logout |
| Frontend | `Frontend/src/features/auth/AuthPage.tsx:92-161` | Form đăng nhập/đăng ký/forgot/reset |
| Database | `database/couple_world.sql:13-33` | Bảng `users` lưu tài khoản |

| API | Request | Response |
|---|---|---|
| `POST /api/auth/register` | `{ displayName, email, password, confirmPassword }` | `{ accessToken, needsOnboarding, user }` |
| `POST /api/auth/login` | `{ email, password }` | `{ accessToken, needsOnboarding, user }` |
| `GET /api/auth/me` | Header/cookie token | `{ user }` |
| `POST /api/auth/refresh-token` | Header/cookie token | `{ accessToken, needsOnboarding, user }` |
| `POST /api/auth/logout` | Token nếu có | `{ loggedOut: true }` |
| `POST /api/auth/presence/offline` | Token nếu có | `{ offline: true }` |

Luồng hoạt động:
1. User nhập email/mật khẩu ở `AuthPage`.
2. Frontend gọi `loginWithPassword` hoặc `registerAccount`.
3. Backend validate dữ liệu trong controller.
4. Service truy vấn `users`, hash/verify password.
5. Backend tạo access token, set cookie `only_us_access_token`.
6. Frontend lưu token, cập nhật `AuthProvider`, chuyển về dashboard.

### Quên mật khẩu và OTP

Mô tả ngắn: gửi OTP về email nếu SMTP được cấu hình, cho phép xác minh OTP và đặt mật khẩu mới.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/authRoutes.ts:29-31` | Khai báo forgot/verify/reset, có rate limit riêng |
| Controller | `Backend/src/controllers/authController.ts:152-213` | Validate email/OTP/password, gọi service |
| Service | `Backend/src/services/coupleAuthService.ts:137-199` | Tạo OTP, lưu `password_resets`, verify OTP, update password |
| Email | `Backend/src/services/emailService.ts:37-51` | Gửi email OTP nếu có SMTP |
| Frontend | `Frontend/src/features/auth/ForgotPasswordFlow.tsx:22-94` | Flow 4 bước: email, OTP, mật khẩu, done |
| Frontend | `Frontend/src/lib/auth-client.ts:137-159` | API client forgot/verify/reset |
| Database | `database/couple_world.sql:35-41` | Bảng `password_resets` |

| API | Request | Response |
|---|---|---|
| `POST /api/auth/forgot-password` | `{ email }` | `{ sent: true, emailed, devOtp? }` |
| `POST /api/auth/verify-otp` | `{ email, otp }` | `{ valid: true }` |
| `POST /api/auth/reset-password` | `{ email, otp, password, confirmPassword }` | `{ reset: true }` |

Luồng hoạt động:
1. User nhập email.
2. Backend tạo OTP, lưu hoặc cập nhật `password_resets`.
3. Nếu SMTP có cấu hình thì gửi mail; development có thể trả `devOtp`.
4. User nhập OTP, backend kiểm tra còn hạn.
5. User đặt mật khẩu mới, backend update `users.password_hash`, xóa OTP.

### Hồ sơ cá nhân và avatar

Mô tả ngắn: xem/sửa hồ sơ user và upload avatar.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/profileRoutes.ts:9-79` | Bảo vệ bằng `requireAuth`, khai báo profile/avatar/uploads |
| Service | `Backend/src/services/profileService.ts:52-86` | Đọc/cập nhật `users`, map profile và phòng hiện tại |
| Upload | `Backend/src/services/uploadService.ts:37-52` | Multer upload avatar, giới hạn dung lượng và mime |
| Frontend | `Frontend/src/features/profile/ProfilePage.tsx:29-112` | Load profile, upload avatar, submit form hồ sơ |
| Database | `database/couple_world.sql:13-33` | Cột `name`, `avatar_url`, `nickname`, `birthday`, `gender`, `bio`, `interests`, `default_mood` |

| API | Request | Response |
|---|---|---|
| `GET /api/profile/me` | Token | `{ profile }` |
| `PUT /api/profile/me` | `{ displayName, nickname, birthday, gender, bio, interests, defaultMood }` | `{ profile }` |
| `POST /api/profile/avatar` | `multipart/form-data avatar` | `{ profile }` |
| `POST /api/uploads/avatar` | `multipart/form-data avatar` | `{ avatarUrl }` |

Luồng hoạt động:
1. `ProfilePage` gọi `/profile/me`.
2. User sửa form hoặc chọn avatar.
3. Frontend gửi `PUT /profile/me` hoặc `POST /profile/avatar`.
4. Backend cập nhật bảng `users`.
5. Frontend refresh user trong `AuthProvider`.

### Phòng cặp đôi

Mô tả ngắn: mỗi user chỉ thuộc một phòng, mỗi phòng tối đa 2 thành viên; chủ phòng tạo mã mời, người còn lại nhập mã để tham gia.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:77-83` | Khai báo get/create/join/update/avatar |
| Controller | `Backend/src/controllers/coupleController.ts:107-119` | Map request sang service |
| Service | `Backend/src/services/coupleService.ts:635-815` | Tạo phòng, join phòng, cập nhật phòng/avatar |
| Room helper | `Backend/src/middlewares/coupleRoom.ts:70-112` | Lấy phòng hiện tại và role của user |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:529-560` | `RoomGate` tạo phòng/gửi mã join |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:2138-2201` | Upload avatar phòng, đổi tên/mô tả/ngày/theme |
| Frontend | `Frontend/src/components/layout/DashboardShell.tsx:66-83` | Lấy room badge cho sidebar |
| Database | `database/couple_world.sql:43-79`, `530-570` | `couple_rooms`, `couple_members`, trigger giới hạn 2 thành viên và cập nhật status |

| API | Request | Response |
|---|---|---|
| `GET /api/room` | Token | `room` hoặc `null` |
| `POST /api/room` | `{ roomName, anniversaryDate, nickname }` | `room` |
| `POST /api/room/join` | `{ inviteCode, nickname }` | `room` |
| `PATCH /api/room` | `{ roomName?, anniversaryDate?, nickname?, roomBio?, theme? }` | `room` |
| `POST /api/uploads/couple-avatar` | `multipart/form-data avatar` | `{ avatarUrl }` |
| `PATCH /api/room/avatar` | `{ avatarUrl }` | `room` |

Luồng hoạt động:
1. Dashboard gọi `/room`.
2. Nếu `null`, frontend hiện `RoomGate`.
3. Tạo phòng: backend sinh `invite_code`, insert `couple_rooms`, insert owner vào `couple_members`, tạo album mặc định.
4. Join phòng: backend kiểm tra mã, kiểm tra số thành viên, insert partner.
5. Trigger cập nhật `couple_rooms.status` thành `paired` nếu đủ 2 người.

### Dashboard tổng quan và thống kê

Mô tả ngắn: nạp toàn bộ dữ liệu phòng cho các màn hình dashboard và thống kê số lượng.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:85-86` | `/couple/summary`, `/couple/stats` |
| Service | `Backend/src/services/coupleService.ts:817-861`, `1244-1263` | Lấy kỷ niệm gần đây, bài hát hiện tại, task pending, count dữ liệu |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:706-741` | `loadAll()` gọi nhiều API song song |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:918-1010` | UI home dashboard |
| Database | Nhiều bảng: `memories`, `songs`, `couple_tasks`, `moods`, `album_photos`, `calendar_events`, `bucket_items` | Tổng hợp dữ liệu |

| API | Request | Response |
|---|---|---|
| `GET /api/couple/summary` | Token, cần room | `{ room, todayMoods, recentMemories, currentSong, pendingTasks }` |
| `GET /api/couple/stats` | Token, cần room | `{ letters, memories, photos, events, dates, songs, bucketDone, moods }` |

Luồng hoạt động:
1. `CoupleWorldPage` gọi `/room`.
2. Nếu có phòng, frontend gọi song song summary và các API module.
3. Backend truy vấn từng bảng theo `couple_room_id`.
4. Frontend set state và render theo `mode`.

### Mood hôm nay

Mô tả ngắn: mỗi user lưu một mood/ngày; ghi lần hai sẽ cập nhật mood cũ.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:159-160` | GET/PUT mood hôm nay |
| Service | `Backend/src/services/coupleService.ts:2371-2402` | Lấy mood ngày hiện tại, upsert mood |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:974-1000` | Form lưu mood ở home |
| Database | `database/couple_world.sql:452-469` | Bảng `moods`, unique `(couple_room_id, user_id, mood_date)` |

| API | Request | Response |
|---|---|---|
| `GET /api/moods/today` | Token | `Mood[]` |
| `PUT /api/moods/today` | `{ mood, note? }` | `Mood[]` |

Luồng hoạt động: user nhập mood, frontend gọi `PUT`, backend upsert vào `moods`, tạo notification cho partner, frontend reload dữ liệu.

### Kỷ niệm

Mô tả ngắn: lưu kỷ niệm có tiêu đề, ngày, ảnh hoặc địa điểm, nội dung.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:96-99` | CRUD `/memories` |
| Service | `Backend/src/services/coupleService.ts:863-950` | List/create/update/delete kỷ niệm, validate phải có ảnh hoặc địa điểm |
| Upload ảnh | `Backend/src/services/coupleUploadService.ts:27-59` | Lưu ảnh base64 vào `uploads/couple-images` |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:728-729`, `2288-2316`, `2671` | Load, tạo modal kỷ niệm, xóa kỷ niệm |
| Database | `database/couple_world.sql:81-101` | Bảng `memories` |

| API | Request | Response |
|---|---|---|
| `GET /api/memories` | Token | `Memory[]` |
| `POST /api/memories` | `{ title, content?, memoryDate?, imageUrl?, imageData?, placeName? }` | `Memory[]` |
| `PATCH /api/memories/:id` | Các field cần sửa | `Memory[]` |
| `DELETE /api/memories/:id` | Param `id` | `{ deleted: true }` |

Luồng hoạt động: frontend gửi kỷ niệm, backend kiểm tra room, lưu ảnh nếu có base64, insert/update `memories`, tạo notification cho partner.

### Thư/lời nhắn và love notes

Mô tả ngắn: gửi thư riêng, thư bí mật có `unlock_at`, chọn phong bì/giấy/font, đánh dấu người nhận đã mở.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:101-111` | `/letters` và alias `/love-notes` |
| Service | `Backend/src/services/coupleService.ts:952-1090` | CRUD thư, pin love note, open letter |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1370-1509` | Form tạo thư, list phong bì, mở/xóa thư |
| Frontend | `Frontend/src/components/letters/LetterArrivalPrompt.tsx:14-95` | Poll thư mới và hỏi mở thư |
| Database | `database/couple_world.sql:103-132` | Bảng `private_letters` |

| API | Request | Response |
|---|---|---|
| `GET /api/letters` | Token | `Letter[]` |
| `POST /api/letters` | `{ title, content, mood?, receiverId?, unlockAt?, isSecret?, envelope?, paper?, font? }` | `Letter[]` |
| `PATCH /api/letters/:id` | Field cần sửa | `Letter[]` |
| `PATCH /api/letters/:id/open` | Param `id` | `Letter[]` |
| `DELETE /api/letters/:id` | Param `id` | `{ deleted: true }` |
| `/api/love-notes/*` | Tương tự letters, thêm `PATCH /:id/pin` | `Letter[]` |

Luồng hoạt động:
1. User viết thư trên frontend.
2. Backend insert `private_letters` và notify partner.
3. Khi người nhận mở thư, frontend gọi `PATCH /letters/:id/open`.
4. Backend chỉ set `opened_at` nếu người mở không phải sender và thư chưa mở.

### Việc chung và love goals

Mô tả ngắn: quản lý checklist việc chung với trạng thái `todo`, `doing`, `done`.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:113-117`, `133-136` | `/tasks` và alias `/love-goals` |
| Service | `Backend/src/services/coupleService.ts:1658-1741` | List/create/update/done/delete |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1331-1368` | Form thêm task, nút hoàn thành/xóa |
| Database | `database/couple_world.sql:233-252` | Bảng `couple_tasks` |

| API | Request | Response |
|---|---|---|
| `GET /api/tasks` | Token | `CoupleTask[]` |
| `POST /api/tasks` | `{ title, category?, description? }` | `CoupleTask[]` |
| `PATCH /api/tasks/:id` | `{ title?, description?, category?, status? }` | `CoupleTask[]` |
| `PATCH /api/tasks/:id/done` | Param `id` | `CoupleTask[]` |
| `DELETE /api/tasks/:id` | Param `id` | `{ deleted: true }` |

Luồng hoạt động: frontend submit task, backend insert `couple_tasks`, partner nhận notification, frontend reload list.

### Bucket list

Mô tả ngắn: lưu những điều hai người muốn làm cùng nhau và đánh dấu hoàn thành.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:119-122` | CRUD bucket list |
| Service | `Backend/src/services/coupleService.ts:1112-1173` | List/create/toggle/delete |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1797-1853` | Form thêm, checkbox hoàn thành, xóa |
| Database | `database/couple_world.sql:134-151` | Bảng `bucket_items` |

| API | Request | Response |
|---|---|---|
| `GET /api/bucket-list` | Token | `BucketItem[]` |
| `POST /api/bucket-list` | `{ title, note? }` | `BucketItem[]` |
| `PATCH /api/bucket-list/:id/toggle` | Param `id` | `BucketItem[]` |
| `DELETE /api/bucket-list/:id` | Param `id` | `BucketItem[]` |

Luồng hoạt động: user thêm/toggle/xóa bucket item, backend chỉ thao tác trong `couple_room_id` hiện tại.

### Ví chung

Mô tả ngắn: ghi khoản chi chung, frontend tổng hợp theo danh mục và người chi.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:124-126` | `/wallet` |
| Service | `Backend/src/services/coupleService.ts:1199-1242` | List/create/delete khoản chi |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1855-1975` | Form chi tiêu, tổng chi, biểu đồ theo category/person |
| Database | `database/couple_world.sql:177-195` | Bảng `wallet_entries` |

| API | Request | Response |
|---|---|---|
| `GET /api/wallet` | Token | `WalletEntry[]` |
| `POST /api/wallet` | `{ title, category?, amount, note?, spentAt? }` | `WalletEntry[]` |
| `DELETE /api/wallet/:id` | Param `id` | `WalletEntry[]` |

Luồng hoạt động: frontend gửi khoản chi, backend chuẩn hóa amount, insert `wallet_entries`, notify partner, frontend tính tổng.

### Thử thách

Mô tả ngắn: tạo thử thách theo số ngày, mỗi ngày check-in một lần, có streak.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:128-131` | `/challenges` |
| Service | `Backend/src/services/coupleService.ts:1558-1656` | List, create, check-in/bỏ check-in, delete |
| Ghi chú code | `Backend/src/services/coupleService.ts:1618-1619` | `updateChallenge` đang khai báo rỗng và chưa có route dùng |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:2045-2112` | Form tạo, thanh tiến độ, check-in/xóa |
| Database | `database/couple_world.sql:197-231` | `challenges`, `challenge_checkins` |

| API | Request | Response |
|---|---|---|
| `GET /api/challenges` | Token | `Challenge[]` |
| `POST /api/challenges` | `{ title, targetDays }` | `Challenge[]` |
| `PATCH /api/challenges/:id/checkin` | Param `id` | `Challenge[]` |
| `DELETE /api/challenges/:id` | Param `id` | `Challenge[]` |

Luồng hoạt động: frontend tạo thử thách, backend insert `challenges`; check-in toggle dòng trong `challenge_checkins` theo `curdate()`.

### Lịch hẹn

Mô tả ngắn: tạo/sửa/xóa lịch hẹn và tự tạo thông báo khi sự kiện đến hạn.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:138-141` | CRUD `/calendar-events` |
| Service | `Backend/src/services/coupleService.ts:1764-1835` | List/create/update/delete lịch |
| Notification due | `Backend/src/services/coupleService.ts:589-623` | Tạo notification cho event quá hạn chưa gửi |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:2321-2352` | Modal thêm lịch |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1222` | Xóa lịch |
| Database | `database/couple_world.sql:254-273` | Bảng `calendar_events` |

| API | Request | Response |
|---|---|---|
| `GET /api/calendar-events` | Token | `CalendarEvent[]` |
| `POST /api/calendar-events` | `{ title, eventType, startsAt, description? }` | `CalendarEvent[]` |
| `PATCH /api/calendar-events/:id` | Field cần sửa | `CalendarEvent[]` |
| `DELETE /api/calendar-events/:id` | Param `id` | `{ deleted: true }` |

Luồng hoạt động: frontend tạo lịch, backend chuẩn hóa `starts_at`, insert `calendar_events`; khi list notifications/calendar, backend gọi `pushDueCalendarNotifications`.

### Playlist nhạc

Mô tả ngắn: lưu bài hát/link nghe nhạc và lời nhắn kèm bài.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:143-146` | CRUD `/music` |
| Service | `Backend/src/services/coupleService.ts:1837-1927` | List/add/update/delete bài hát |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:1287-1328` | Form thêm bài, embed, xóa |
| Database | `database/couple_world.sql:275-295` | Bảng `songs` |

| API | Request | Response |
|---|---|---|
| `GET /api/music` | Token | `Song[]` |
| `POST /api/music` | `{ title, artist?, sourceType, sourceUrl, coverUrl?, message? }` | `Song[]` |
| `PATCH /api/music/:id` | Field cần sửa | `Song[]` |
| `DELETE /api/music/:id` | Param `id` | `{ deleted: true }` |

Luồng hoạt động: user gửi link nhạc, backend validate `source_type`, insert `songs`, notify partner, frontend render embed.

### Câu hỏi hằng ngày và câu hỏi tâm sự

Mô tả ngắn: mỗi ngày hệ thống chọn một câu hỏi mặc định; user trả lời. Backend còn hỗ trợ câu hỏi custom trong phòng.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:148-151` | Daily question và room quiz answer |
| Service | `Backend/src/services/coupleService.ts:1929-2076` | Chọn câu hỏi theo ngày, list answer, tạo/trả lời room quiz |
| Frontend | `Frontend/src/features/couple/CoupleWorldPage.tsx:734`, `1643-1663` | Load `/questions/today`, gửi answer daily |
| Frontend gap | `Frontend/src/features/couple/CoupleWorldPage.tsx` | Chưa thấy chỗ gọi `POST /questions` hoặc `POST /questions/:quizId/answers` |
| Database | `database/couple_world.sql:297-367`, `574-582` | `daily_questions`, `daily_answers`, `couple_quizzes`, `couple_quiz_answers` |

| API | Request | Response |
|---|---|---|
| `GET /api/questions/today` | Token | `{ question, answers, roomQuizzes }` |
| `POST /api/questions/answers` | `{ questionId, answer }` | `{ question, answers, roomQuizzes }` |
| `POST /api/questions` | `{ question, optionA?, optionB?, optionC? }` | `{ question, answers, roomQuizzes }` |
| `POST /api/questions/:quizId/answers` | `{ answer }` | `{ question, answers, roomQuizzes }` |

Luồng hoạt động:
1. Frontend gọi `/questions/today`.
2. Backend lấy danh sách active `daily_questions`, chọn câu theo số ngày.
3. User trả lời, backend upsert vào `daily_answers`.
4. Nếu dùng room quiz API, backend lưu vào `couple_quizzes` và `couple_quiz_answers`.

### Quiz game tâm sự

Mô tả ngắn: tạo game trắc nghiệm nhiều câu, người chơi mở link `/quiz/:id`, trả lời có timer, backend chấm điểm và lưu attempt.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:153-157` | List/create/play/report/attempt |
| Service | `Backend/src/services/coupleService.ts:2139-2369` | Tạo quiz game, câu hỏi, đọc play/report, lưu attempt và đáp án |
| Frontend list | `Frontend/src/features/couple/CoupleWorldPage.tsx:1518-1641` | UI list quiz game, link chơi, lịch sử attempt |
| Frontend create | `Frontend/src/features/couple/CoupleWorldPage.tsx:2427-2565` | Modal tạo game, validate câu hỏi A/B và đáp án đúng |
| Frontend play | `Frontend/src/features/couple/CoupleQuizPlayPage.tsx:62-155` | Load game, timer, submit attempt |
| Database | `database/couple_world.sql:369-450` | `couple_quiz_games`, `couple_quiz_game_questions`, `couple_quiz_attempts`, `couple_quiz_attempt_answers` |

| API | Request | Response |
|---|---|---|
| `GET /api/quiz-games` | Token | `QuizGame[]` |
| `POST /api/quiz-games` | `{ title, meaning?, timeLimitSeconds, questions[] }` | `QuizGame` report |
| `GET /api/quiz-games/:gameId/play` | Token | `QuizGame` không lộ `correctOption` |
| `GET /api/quiz-games/:gameId/report` | Token | `QuizGame` có đáp án đúng |
| `POST /api/quiz-games/:gameId/attempts` | `{ durationSeconds, answers: [{ questionId, selectedOption }] }` | `QuizGame` report |

Luồng hoạt động: người tạo quiz nhập câu hỏi, backend transaction insert game và questions; người chơi mở link, frontend lấy bản play, submit answers; backend tính score, insert attempt và attempt answers, trả report.

### Album ảnh

Mô tả ngắn: tạo album và thêm ảnh bằng link hoặc ảnh base64.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:162-165` | Albums và photos |
| Service | `Backend/src/services/coupleService.ts:2404-2483` | List album/photos, tạo album, thêm/xóa ảnh |
| Frontend list | `Frontend/src/features/couple/CoupleWorldPage.tsx:1669-1710` | Danh sách album |
| Frontend create/photo | `Frontend/src/features/couple/CoupleWorldPage.tsx:2357-2412`, `2609` | Tạo album, thêm/xóa ảnh |
| Database | `database/couple_world.sql:471-507` | `albums`, `album_photos` |

| API | Request | Response |
|---|---|---|
| `GET /api/albums` | Token | `Album[]` kèm `photos[]` |
| `POST /api/albums` | `{ title, description? }` | `Album[]` |
| `POST /api/albums/:albumId/photos` | `{ imageUrl?, imageData?, caption? }` | `Album[]` |
| `DELETE /api/albums/photos/:photoId` | Param `photoId` | `{ deleted: true }` |

Luồng hoạt động: frontend tạo album hoặc gửi ảnh, backend kiểm tra album thuộc room, lưu ảnh nếu là base64, insert `album_photos`, notify partner.

### Thông báo

Mô tả ngắn: các hành động của một người tạo thông báo cho người còn lại; frontend poll và đánh dấu đã đọc.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:167-169` | List/read/read-all notifications |
| Service | `Backend/src/services/coupleService.ts:538-587`, `2485-2525` | Tạo notification, list unread, mark read |
| Frontend | `Frontend/src/components/layout/NotificationBell.tsx:29-101` | Poll notification, mark all/one read |
| Database | `database/couple_world.sql:509-526` | Bảng `notifications` |

| API | Request | Response |
|---|---|---|
| `GET /api/notifications` | Token | `{ unreadCount, notifications }` |
| `PATCH /api/notifications/read-all` | Token | `{ unreadCount, notifications }` |
| `PATCH /api/notifications/:id/read` | Param `id` | `{ unreadCount, notifications }` |

Luồng hoạt động: service gọi `notifyPartner` hoặc `notifyRoom`, insert `notifications`; `NotificationBell` gọi `/notifications` định kỳ; user đọc thì backend update `is_read = 1`.

### Game cờ caro

Mô tả ngắn: game 2 người trong phòng, có mời chơi, oẳn tù tì chọn người đi trước, đánh cờ caro 3x3, điểm thắng/hòa.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route | `Backend/src/routes/coupleRoutes.ts:88-94` | `/game`, `/game/move`, invite/accept/decline/rps/surrender |
| Service | `Backend/src/services/coupleService.ts:1265-1546` | Logic board, thắng thua, RPS, score, atomic update |
| Frontend | `Frontend/src/features/couple/CoupleGamePage.tsx:62-169` | Load/poll game, surrender khi rời trang, action helper |
| Frontend | `Frontend/src/components/game/GameInvitePrompt.tsx:19-86` | Poll lời mời game, accept/decline |
| Database | `database/couple_world.sql:153-175` | Bảng `couple_games` |

| API | Request | Response |
|---|---|---|
| `GET /api/game` | Token | `GameState` |
| `POST /api/game/invite` | Token | `GameState` |
| `POST /api/game/accept` | Token | `GameState` |
| `POST /api/game/decline` | Token | `GameState` |
| `POST /api/game/rps` | `{ choice: "R"|"P"|"S" }` | `GameState` |
| `POST /api/game/move` | `{ index: 0..8 }` | `GameState` |
| `POST /api/game/surrender` | Token | `GameState` |

Luồng hoạt động:
1. User vào `/games`, frontend poll `/game`.
2. Một người bấm mời, backend set `status = pending`.
3. Partner accept, backend chuyển `status = rps`.
4. Cả hai chọn R/P/S; người thắng RPS được đi trước.
5. Backend kiểm tra lượt, ô trống, thắng/hòa, cộng điểm một lần.
6. Frontend render board và bảng xếp hạng.

### Upload và media

Mô tả ngắn: lưu file avatar/ảnh phòng qua multer hoặc ảnh base64 cho kỷ niệm/album; media ảnh phòng/ảnh kỷ niệm được bảo vệ theo room.

| Phần | File/dòng | Vai trò |
|---|---|---|
| Route upload | `Backend/src/routes/profileRoutes.ts:37-79` | Upload avatar user/couple avatar |
| Route media | `Backend/src/routes/mediaRoutes.ts:12-69` | Trả file avatar, couple avatar, couple image |
| Upload multer | `Backend/src/services/uploadService.ts:37-52` | Upload JPG/PNG/WEBP, avatar 2MB, couple avatar 3MB |
| Upload base64 | `Backend/src/services/coupleUploadService.ts:27-59` | Lưu JPG/PNG/WEBP/GIF tối đa 5MB |
| Frontend | `Frontend/src/features/profile/ProfilePage.tsx:68-96`, `Frontend/src/features/couple/CoupleWorldPage.tsx:2141-2149`, `2288-2316`, `2401-2408` | Chọn ảnh/avatar/ảnh album |
| Database | `users.avatar_url`, `couple_rooms.couple_avatar_url`, `memories.image_url`, `album_photos.image_url` | Lưu URL public nội bộ |

Luồng hoạt động: frontend gửi file hoặc base64, backend lưu vào upload dir, trả URL `/api/media/...`; route media kiểm tra tên file và quyền phòng trước khi `sendFile`.

## 5. Mapping code theo chức năng

| Chức năng | Backend file | Frontend file | Database | API | Dòng code liên quan |
|---|---|---|---|---|---|
| Health check | `healthRoutes.ts`, `healthController.ts` | `run.bat` | Không | `GET /api/health` | BE: routes 6, controller 3-9 |
| Auth | `authRoutes.ts`, `authController.ts`, `coupleAuthService.ts`, `tokenService.ts` | `AuthPage.tsx`, `AuthProvider.tsx`, `auth-client.ts` | `users` | `/auth/*` | BE: routes 22-28, controller 38-150, service 59-133; FE: AuthPage 92-161, Provider 52-146 |
| Reset password | `authController.ts`, `coupleAuthService.ts`, `emailService.ts` | `ForgotPasswordFlow.tsx`, `auth-client.ts` | `password_resets`, `users` | `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` | BE: 152-213, 137-199; FE: 22-94 |
| Profile | `profileRoutes.ts`, `profileService.ts`, `uploadService.ts` | `ProfilePage.tsx` | `users` | `/profile/me`, `/profile/avatar` | BE: routes 11-79, service 52-86; FE: 29-112 |
| Room | `coupleRoutes.ts`, `coupleController.ts`, `coupleService.ts` | `CoupleWorldPage.tsx`, `DashboardShell.tsx` | `couple_rooms`, `couple_members` | `/room`, `/room/join`, `/room/avatar` | BE: routes 79-83, service 635-815; FE: 529-560, 2138-2201 |
| Summary/stats | `coupleService.ts` | `CoupleWorldPage.tsx` | Nhiều bảng | `/couple/summary`, `/couple/stats` | BE: 817-861, 1244-1263; FE: 706-741, 918-1010 |
| Mood | `coupleService.ts` | `CoupleWorldPage.tsx` | `moods` | `/moods/today` | BE: 2371-2402; FE: 974-1000 |
| Memories | `coupleService.ts`, `coupleUploadService.ts` | `CoupleWorldPage.tsx` | `memories` | `/memories` | BE: 863-950, upload 27-59; FE: 2288-2316 |
| Letters | `coupleService.ts` | `CoupleWorldPage.tsx`, `LetterArrivalPrompt.tsx` | `private_letters` | `/letters`, `/love-notes` | BE: 952-1090; FE: 1370-1509, prompt 14-95 |
| Tasks | `coupleService.ts` | `CoupleWorldPage.tsx` | `couple_tasks` | `/tasks`, `/love-goals` | BE: 1658-1741; FE: 1331-1368 |
| Bucket | `coupleService.ts` | `CoupleWorldPage.tsx` | `bucket_items` | `/bucket-list` | BE: 1112-1173; FE: 1797-1853 |
| Wallet | `coupleService.ts` | `CoupleWorldPage.tsx` | `wallet_entries` | `/wallet` | BE: 1199-1242; FE: 1855-1975 |
| Challenges | `coupleService.ts` | `CoupleWorldPage.tsx` | `challenges`, `challenge_checkins` | `/challenges` | BE: 1558-1656; FE: 2045-2112 |
| Calendar | `coupleService.ts` | `CoupleWorldPage.tsx`, `CoupleCalendarBoard.tsx` | `calendar_events` | `/calendar-events` | BE: 1764-1835; FE: 2321-2352 |
| Music | `coupleService.ts` | `CoupleWorldPage.tsx`, `RoomMusic.tsx` | `songs` | `/music` | BE: 1837-1927; FE: 1287-1328 |
| Daily questions | `coupleService.ts` | `CoupleWorldPage.tsx` | `daily_questions`, `daily_answers` | `/questions/today`, `/questions/answers` | BE: 1929-2044; FE: 1643-1663 |
| Room quizzes | `coupleService.ts` | Chưa thấy FE gọi trực tiếp | `couple_quizzes`, `couple_quiz_answers` | `/questions`, `/questions/:quizId/answers` | BE: 1942-2076; FE: Chưa xác định được dòng chính xác |
| Quiz games | `coupleService.ts` | `CoupleWorldPage.tsx`, `CoupleQuizPlayPage.tsx` | `couple_quiz_games`, `couple_quiz_game_questions`, `couple_quiz_attempts`, `couple_quiz_attempt_answers` | `/quiz-games/*` | BE: 2139-2369; FE: 1518-1641, 2427-2565, quiz play 62-155 |
| Albums | `coupleService.ts`, `coupleUploadService.ts` | `CoupleWorldPage.tsx` | `albums`, `album_photos` | `/albums` | BE: 2404-2483; FE: 1669-1710, 2357-2412 |
| Notifications | `coupleService.ts` | `NotificationBell.tsx` | `notifications` | `/notifications` | BE: 538-587, 2485-2525; FE: 29-101 |
| Game cờ caro | `coupleService.ts` | `CoupleGamePage.tsx`, `GameInvitePrompt.tsx` | `couple_games` | `/game/*` | BE: 1265-1546; FE: GamePage 62-169, Prompt 19-86 |
| Media | `mediaRoutes.ts`, `uploadService.ts` | `ProfilePage.tsx`, `CoupleWorldPage.tsx` | URL trong nhiều bảng | `/uploads/*`, `/media/*` | BE: media 12-69, upload 37-52; FE: Profile 68-96, Couple 2141-2149 |

## 6. Mapping database

| Bảng | Chức năng | Cột quan trọng | File code đang sử dụng |
|---|---|---|---|
| `users` | Tài khoản, hồ sơ, online | `id`, `name`, `email`, `password_hash`, `avatar_url`, `nickname`, `birthday`, `gender`, `bio`, `status`, `last_login_at`, `last_seen_at` | `coupleAuthService.ts`, `profileService.ts`, `auth.ts`, `coupleService.ts` |
| `password_resets` | OTP quên mật khẩu | `email`, `otp`, `expires_at`, `created_at` | `coupleAuthService.ts` |
| `couple_rooms` | Phòng riêng | `id`, `room_name`, `invite_code`, `owner_user_id`, `anniversary_date`, `couple_avatar_url`, `room_bio`, `theme`, `status` | `coupleRoom.ts`, `coupleService.ts` |
| `couple_members` | Thành viên phòng | `id`, `couple_room_id`, `user_id`, `role`, `nickname`, `joined_at` | `coupleRoom.ts`, `coupleService.ts` |
| `memories` | Kỷ niệm | `id`, `couple_room_id`, `created_by`, `title`, `content`, `memory_date`, `image_url`, `place_name` | `coupleService.ts`, `mediaRoutes.ts` |
| `private_letters` | Thư/lời nhắn | `id`, `sender_id`, `receiver_id`, `title`, `content`, `mood`, `unlock_at`, `is_secret`, `pinned`, `opened_at` | `coupleService.ts` |
| `bucket_items` | Mong ước chung | `title`, `note`, `is_done`, `done_at` | `coupleService.ts` |
| `couple_games` | Game cờ caro | `board`, `turn`, `x_user_id`, `o_user_id`, `x_rps`, `o_rps`, `status`, `winner`, `x_score`, `o_score`, `draws` | `coupleService.ts` |
| `wallet_entries` | Ví chung | `category`, `title`, `amount`, `note`, `spent_at`, `created_by` | `coupleService.ts` |
| `challenges` | Thử thách | `title`, `target_days`, `created_by` | `coupleService.ts` |
| `challenge_checkins` | Check-in thử thách | `challenge_id`, `user_id`, `check_date` | `coupleService.ts` |
| `couple_tasks` | Việc chung | `title`, `description`, `category`, `status`, `completed_at` | `coupleService.ts` |
| `calendar_events` | Lịch hẹn | `title`, `event_type`, `description`, `starts_at`, `reminder_sent_at` | `coupleService.ts` |
| `songs` | Playlist | `title`, `artist`, `cover_url`, `source_type`, `source_url`, `message` | `coupleService.ts` |
| `daily_questions` | Câu hỏi mặc định | `question`, `category`, `is_active` | `coupleService.ts`, `coupleSchemaCheck.ts` |
| `daily_answers` | Trả lời câu hỏi ngày | `question_id`, `user_id`, `answer`, `answer_date` | `coupleService.ts` |
| `couple_quizzes` | Câu hỏi custom trong phòng | `question`, `quiz_type`, `option_a`, `option_b`, `option_c` | `coupleService.ts` |
| `couple_quiz_answers` | Trả lời câu hỏi custom | `quiz_id`, `user_id`, `answer` | `coupleService.ts` |
| `couple_quiz_games` | Game quiz | `title`, `meaning`, `time_limit_seconds`, `status` | `coupleService.ts` |
| `couple_quiz_game_questions` | Câu hỏi game quiz | `game_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `sort_order` | `coupleService.ts` |
| `couple_quiz_attempts` | Lượt chơi quiz | `game_id`, `user_id`, `score`, `total_questions`, `duration_seconds` | `coupleService.ts` |
| `couple_quiz_attempt_answers` | Đáp án từng câu | `attempt_id`, `question_id`, `selected_option`, `is_correct` | `coupleService.ts` |
| `moods` | Mood hằng ngày | `user_id`, `mood`, `note`, `mood_date` | `coupleService.ts` |
| `albums` | Album ảnh | `title`, `description`, `created_by` | `coupleService.ts` |
| `album_photos` | Ảnh trong album | `album_id`, `uploaded_by`, `image_url`, `caption` | `coupleService.ts`, `mediaRoutes.ts` |
| `notifications` | Thông báo | `user_id`, `type`, `title`, `content`, `is_read` | `coupleService.ts`, `NotificationBell.tsx` |

Quan hệ chính:

```text
users 1-n couple_rooms qua couple_rooms.owner_user_id
couple_rooms 1-n couple_members
users 1-n couple_members
couple_rooms 1-n memories/private_letters/bucket_items/wallet_entries/challenges/couple_tasks/calendar_events/songs/moods/albums/notifications
users 1-n memories/private_letters/couple_tasks/calendar_events/songs/wallet_entries/challenges/moods/albums/album_photos
challenges 1-n challenge_checkins
daily_questions 1-n daily_answers
couple_quizzes 1-n couple_quiz_answers
couple_quiz_games 1-n couple_quiz_game_questions
couple_quiz_games 1-n couple_quiz_attempts
couple_quiz_attempts 1-n couple_quiz_attempt_answers
albums 1-n album_photos
couple_rooms 1-1 couple_games
```

Trigger quan trọng trong `database/couple_world.sql`:

| Trigger | Dòng | Vai trò |
|---|---:|---|
| `trg_couple_members_before_insert` | 530-544 | Chặn phòng có hơn 2 thành viên |
| `trg_couple_members_after_insert` | 546-557 | Cập nhật trạng thái phòng thành `paired` hoặc `waiting` |
| `trg_couple_members_after_delete` | 559-570 | Cập nhật lại trạng thái phòng khi xóa thành viên |

## 7. Luồng xử lý chính của hệ thống

### Luồng khởi động backend

1. `server.ts` gọi `validateCoupleSchemaReady`.
2. `coupleSchemaCheck.ts` kiểm tra đủ table, column, trigger và có câu hỏi active.
3. Nếu thiếu schema, backend dừng và yêu cầu import `database/couple_world.sql`.
4. Nếu hợp lệ, `createApp()` mount `/api` và lắng nghe port.

### Luồng đăng nhập

1. Người dùng nhập email/mật khẩu.
2. Frontend gọi `POST /api/auth/login`.
3. Backend tìm user theo email và `status <> DELETED`.
4. Backend verify password hash.
5. Backend cập nhật `last_login_at`, tạo access token.
6. Response trả user/session, đồng thời set cookie HttpOnly.
7. Frontend lưu token và chuyển vào dashboard.

### Luồng tạo/tham gia phòng

1. Dashboard gọi `GET /api/room`.
2. Nếu chưa có phòng, frontend hiện `RoomGate`.
3. Tạo phòng: backend sinh invite code, insert room, insert owner, tạo album mặc định.
4. Tham gia phòng: backend kiểm tra invite code và số thành viên.
5. Trigger cập nhật `couple_rooms.status`.
6. Frontend reload toàn bộ dữ liệu phòng.

### Luồng thêm kỷ niệm/album ảnh

1. User chọn ảnh hoặc dán link, nhập tiêu đề/nội dung.
2. Frontend gửi `POST /memories` hoặc `POST /albums/:albumId/photos`.
3. Backend kiểm tra user thuộc phòng.
4. Nếu có `imageData`, backend lưu file trong upload dir và lấy URL `/api/media/couple-images/...`.
5. Backend insert DB và tạo notification cho partner.
6. Frontend reload list.

### Luồng gửi thư

1. User viết thư, chọn thư bí mật hoặc thường.
2. Frontend gọi `POST /api/letters`.
3. Backend kiểm tra receiver nếu có, insert `private_letters`.
4. Backend tạo notification cho partner.
5. Khi partner mở thư, frontend gọi `PATCH /letters/:id/open`.
6. Backend set `opened_at` để sender thấy trạng thái đã mở.

### Luồng notification

1. Một service gọi `notifyPartner` hoặc `notifyRoom`.
2. Backend insert dòng vào `notifications`.
3. `NotificationBell` poll `GET /notifications`.
4. User bấm đọc một thông báo hoặc đọc hết.
5. Backend update `is_read = 1`.

### Luồng quiz game

1. User tạo quiz game với tiêu đề, ý nghĩa, câu hỏi và đáp án đúng.
2. Backend transaction insert `couple_quiz_games` và `couple_quiz_game_questions`.
3. Người chơi mở `/quiz/:id`, frontend gọi `GET /quiz-games/:gameId/play`.
4. Frontend chạy timer từng câu và gửi attempt.
5. Backend tính điểm, insert `couple_quiz_attempts` và `couple_quiz_attempt_answers`.
6. Backend trả report có điểm và đáp án đúng.

### Luồng game cờ caro

1. User bấm mời chơi.
2. Backend set game `pending`.
3. Partner accept, backend set `rps`.
4. Cả hai chọn R/P/S, backend quyết người đi trước.
5. User đánh ô, backend kiểm tra lượt và thắng/hòa.
6. Backend cập nhật `board`, `status`, `winner`, điểm.
7. Frontend poll để đồng bộ.

## 8. Các file quan trọng nhất cần nhớ khi bảo vệ đồ án

| File | Vai trò |
|---|---|
| `Backend/src/app.ts` | Cấu hình Express app, CORS, JSON body, mount `/api` |
| `Backend/src/server.ts` | Kiểm tra schema trước khi start backend |
| `Backend/src/config/env.ts` | Cấu hình env, MySQL, CORS, upload dir |
| `Backend/src/routes/authRoutes.ts` | Danh sách API xác thực |
| `Backend/src/controllers/authController.ts` | Validate đăng ký/đăng nhập/OTP/logout |
| `Backend/src/services/coupleAuthService.ts` | Logic user, password, OTP |
| `Backend/src/services/tokenService.ts` | Tạo và kiểm tra token/cookie |
| `Backend/src/middlewares/auth.ts` | Bảo vệ API bằng Bearer/cookie token |
| `Backend/src/routes/coupleRoutes.ts` | Toàn bộ API nghiệp vụ của phòng cặp đôi |
| `Backend/src/controllers/coupleController.ts` | Controller tổng hợp gọi service nghiệp vụ |
| `Backend/src/services/coupleService.ts` | File nghiệp vụ lớn nhất: room, memories, letters, tasks, wallet, calendar, quiz, game |
| `Backend/src/database/coupleSchemaCheck.ts` | Kiểm tra database đủ bảng/cột/trigger trước khi chạy |
| `database/couple_world.sql` | Schema MySQL, foreign key, trigger, dữ liệu câu hỏi mặc định |
| `Frontend/src/lib/api-client.ts` | Hàm gọi API chung, xử lý response/error |
| `Frontend/src/lib/auth-client.ts` | Hàm gọi API auth, lưu/refresh token |
| `Frontend/src/providers/AuthProvider.tsx` | Trạng thái đăng nhập toàn app |
| `Frontend/src/features/couple/CoupleWorldPage.tsx` | Màn hình nghiệp vụ chính cho dashboard |
| `Frontend/src/features/couple/CoupleGamePage.tsx` | UI game cờ caro |
| `Frontend/src/features/couple/CoupleQuizPlayPage.tsx` | UI chơi quiz game |
| `Frontend/src/features/profile/ProfilePage.tsx` | UI hồ sơ cá nhân |
| `Frontend/src/components/layout/DashboardShell.tsx` | Layout dashboard, menu, notification bell |
| `Frontend/next.config.ts` | Rewrite `/api` sang backend origin |
| `setup.bat`, `run.bat`, `rebuild.bat` | Cài đặt, build, chạy/rebuild production |

## 9. Gợi ý câu hỏi bảo vệ đồ án

### Câu hỏi 1: Dự án này dùng kiến trúc gì?

Trả lời: Dự án dùng frontend Next.js, backend Express TypeScript và database MySQL. Frontend gọi REST API qua `/api`, backend xử lý nghiệp vụ và truy vấn MySQL.

### Câu hỏi 2: Đăng nhập hoạt động như thế nào?

Trả lời: Frontend gọi `POST /auth/login`, backend kiểm tra email/mật khẩu trong bảng `users`, nếu đúng tạo access token HMAC-SHA256, set cookie HttpOnly và trả session cho frontend.

### Câu hỏi 3: Vì sao mỗi phòng chỉ có tối đa 2 người?

Trả lời: Backend kiểm tra số thành viên khi join phòng, đồng thời database có trigger `trg_couple_members_before_insert` chặn insert nếu phòng đã đủ 2 thành viên.

### Câu hỏi 4: Backend bảo vệ API bằng cách nào?

Trả lời: Middleware `requireAuth` đọc Bearer token hoặc cookie, verify token, set `req.userId`; nếu không hợp lệ trả 401.

### Câu hỏi 5: Dữ liệu của phòng này có bị lẫn sang phòng khác không?

Trả lời: Hầu hết truy vấn đều lọc theo `couple_room_id` lấy từ user hiện tại. Khi sửa/xóa resource, service kiểm tra resource thuộc phòng bằng `ensureResourceBelongsToRoom`.

### Câu hỏi 6: Ảnh được lưu như thế nào?

Trả lời: Avatar dùng multer lưu file vào upload dir. Ảnh kỷ niệm/album có thể gửi base64, backend decode, kiểm tra mime/dung lượng rồi lưu file và lưu URL `/api/media/couple-images/...` vào database.

### Câu hỏi 7: Notification được tạo khi nào?

Trả lời: Khi một người tạo kỷ niệm, thư, task, lịch, nhạc, mood, quiz, album ảnh... service gọi `notifyPartner` hoặc `notifyRoom` để insert bảng `notifications`.

### Câu hỏi 8: Câu hỏi hằng ngày được chọn như thế nào?

Trả lời: Backend lấy các câu hỏi active trong `daily_questions`, tính số ngày từ timestamp hiện tại rồi modulo theo số câu hỏi để chọn câu trong ngày.

### Câu hỏi 9: Quiz game chấm điểm ra sao?

Trả lời: Khi user nộp attempt, backend đọc các câu hỏi của game, so sánh `selectedOption` với `correct_option`, tính score, lưu attempt và từng đáp án vào database.

### Câu hỏi 10: Game cờ caro xử lý lượt chơi thế nào?

Trả lời: Bảng `couple_games` lưu board 9 ô, lượt hiện tại, trạng thái, người chơi X/O. Backend chỉ cho đánh nếu `status = playing`, đúng lượt và ô còn trống.

### Câu hỏi 11: Tại sao cần `coupleSchemaCheck.ts`?

Trả lời: File này giúp backend kiểm tra database đã import đủ bảng, cột, trigger và câu hỏi mặc định trước khi chạy, tránh lỗi runtime khi user dùng app.

### Câu hỏi 12: Frontend gọi API tập trung ở đâu?

Trả lời: `api-client.ts` tạo URL, gửi fetch với `credentials: include`, xử lý lỗi. `auth-client.ts` thêm Authorization header và tự refresh session khi gặp 401.

### Câu hỏi 13: Có chức năng quản trị không?

Trả lời: Hiện tại chưa có module quản trị riêng. Dự án chủ yếu có user thường và thành viên phòng. Backend không có route `/admin`.

### Câu hỏi 14: CORS được xử lý thế nào?

Trả lời: `app.ts` kiểm tra origin theo `env.corsOrigins`; production chỉ cho origin cấu hình, development cho localhost và ngrok.

### Câu hỏi 15: Các bảng quan trọng nhất là gì?

Trả lời: `users` lưu tài khoản, `couple_rooms` lưu phòng, `couple_members` lưu thành viên, các bảng nghiệp vụ như `memories`, `private_letters`, `calendar_events`, `albums`, `notifications` lưu dữ liệu hoạt động của cặp đôi.

## 10. Ghi chú cấu hình và điểm cần lưu ý

| Nội dung | Ghi chú |
|---|---|
| Env backend | `Backend/src/config/env.ts` đọc `Backend/.env`, gồm `PORT`, `CORS_ORIGIN`, `DB_*`, `AUTH_SECRET`, `UPLOAD_DIR`, SMTP |
| Env frontend | `Frontend/next.config.ts` dùng `NEXT_PRIVATE_BACKEND_ORIGIN`/`BACKEND_ORIGIN` để rewrite `/api` |
| Database | Import `database/couple_world.sql` trước khi chạy backend |
| Build | Backend build bằng `tsc`, frontend build bằng `next build` |
| Deploy | `deploy/nginx.conf` proxy frontend và API, `windows-start-pm2.bat` chạy PM2 |
| File `.env.example` | `README.md` và `setup.bat` nhắc `.env.example`, nhưng trong workspace hiện tại không thấy các file `.env.example` khi liệt kê thư mục |
| Code cần chú ý | `ProfilePage.tsx` dòng 80 có hai ký tự backtick thừa sau `setPendingCropFile(file);`, có thể gây lỗi type/lint nếu build chạm tới |
| Code chưa hoàn chỉnh | `coupleService.ts:1618-1619` có `updateChallenge` rỗng nhưng hiện chưa được route sử dụng |
