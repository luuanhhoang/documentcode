import { createBucket, deleteBucket, listBucket, toggleBucket, createWallet, deleteWallet, listWallet, getStats, getGame, makeGameMove, inviteGame, acceptGame, declineGame, playRps, surrenderGame, listChallenges, createChallenge, checkinChallenge, deleteChallenge, addAlbumPhoto, addSong, createAlbum, createCalendarEvent, createLetter, createMemory, openLetter, createQuizGame, createRoomQuiz, createRoom, createTask, deleteAlbumPhoto, deleteCalendarEvent, deleteLetter, deleteMemory, deleteTask, getMyRoom, getQuizGameForPlay, getQuizGameReport, getSummary, getTodayMoods, joinRoom, listAlbums, listCalendarEvents, listLetters, listMemories, listNotifications, listQuizGames, listQuestionAnswers, listSongs, listTasks, markNotificationRead, markTaskDone, pinLoveNote, removeSong, setTodayMood, submitDailyAnswer, submitQuizGameAttempt, submitRoomQuizAnswer, updateCalendarEvent, updateLetter, updateMemory, updateRoom, updateRoomAvatar, updateSong, updateTask } from "../services/coupleService.js";
import { fail, ok } from "../utils/apiResponse.js";
const userIdOrThrow = (req) => {
    if (!req.userId) {
        throw new Error("Vui lòng đăng nhập để tiếp tục");
    }
    return req.userId;
};
const statusForError = (message) => {
    if (message.includes("cần tạo") || message.includes("tham gia phòng")) {
        return 428;
    }
    if (message.includes("Không tìm thấy")) {
        return 404;
    }
    return 400;
};
// tổng hợp controller để giảm ... boilerplate, chỉ cần truyền message + action là xong, còn việc lấy userId, bắt lỗi, trả response thì controller lo hết
const controller = (message, action) => async (req, res, next) => {
    try {
        ok(res, message, await action(req, userIdOrThrow(req)));
    }
    catch (error) {
        if (error instanceof Error) {
            fail(res, statusForError(error.message), error.message);
            return;
        }
        next(error);
    }
};
export const getRoomController = controller("Phòng riêng của bạn", (_req, userId) => getMyRoom(userId));
export const createRoomController = controller("Đã tạo thế giới nhỏ", (req, userId) => createRoom(userId, req.body));
export const joinRoomController = controller("Đã tham gia phòng riêng", (req, userId) => {
    const { inviteCode, nickname } = req.body;
    return joinRoom(userId, inviteCode, nickname);
});
export const updateRoomController = controller("Đã cập nhật phòng riêng", (req, userId) => updateRoom(userId, req.body));
export const updateRoomAvatarController = controller("Đã cập nhật ảnh phòng", (req, userId) => updateRoomAvatar(userId, String(req.body.avatarUrl ?? "")));
export const summaryController = controller("Tổng quan thế giới nhỏ", (_req, userId) => getSummary(userId));
export const statsController = controller("Thống kê thành tựu", (_req, userId) => getStats(userId));
export const getGameController = controller("Trò chơi đôi mình", (_req, userId) => getGame(userId));
export const gameMoveController = controller("Đã đánh một nước", (req, userId) => makeGameMove(userId, req.body?.index));
export const inviteGameController = controller("Đã mời chơi", (_req, userId) => inviteGame(userId));
export const acceptGameController = controller("Đã vào ván", (_req, userId) => acceptGame(userId));
export const declineGameController = controller("Đã huỷ lời mời", (_req, userId) => declineGame(userId));
export const playRpsController = controller("Đã chọn", (req, userId) => playRps(userId, req.body?.choice));
export const surrenderGameController = controller("Đã đầu hàng", (_req, userId) => surrenderGame(userId));
export const listMemoriesController = controller("Kỷ niệm của chúng mình", (_req, userId) => listMemories(userId));
export const createMemoryController = controller("Đã lưu kỷ niệm", (req, userId) => createMemory(userId, req.body));
export const updateMemoryController = controller("Đã cập nhật kỷ niệm", (req, userId) => updateMemory(userId, req.params.id, req.body));
export const deleteMemoryController = controller("Đã xóa kỷ niệm", (req, userId) => deleteMemory(userId, req.params.id));
export const listLettersController = controller("Lời nhắn riêng", (_req, userId) => listLetters(userId));
export const createLetterController = controller("Đã gửi lời nhắn", (req, userId) => createLetter(userId, req.body));
export const updateLetterController = controller("Đã cập nhật lời nhắn", (req, userId) => updateLetter(userId, req.params.id, req.body));
export const deleteLetterController = controller("Đã xóa lời nhắn", (req, userId) => deleteLetter(userId, req.params.id));
export const pinLoveNoteController = controller("Đã ghim lời nhắn", (req, userId) => pinLoveNote(userId, req.params.id));
export const openLetterController = controller("Đã mở lá thư", (req, userId) => openLetter(userId, req.params.id));
export const listTasksController = controller("Việc chung", (_req, userId) => listTasks(userId));
export const createTaskController = controller("Đã thêm việc chung", (req, userId) => createTask(userId, req.body));
export const updateTaskController = controller("Đã cập nhật việc chung", (req, userId) => updateTask(userId, req.params.id, req.body));
export const markTaskDoneController = controller("Đã hoàn thành việc chung", (req, userId) => markTaskDone(userId, req.params.id));
export const deleteTaskController = controller("Đã xóa việc chung", (req, userId) => deleteTask(userId, req.params.id));
export const listBucketController = controller("Danh sách mong ước chung", (_req, userId) => listBucket(userId));
export const createBucketController = controller("Đã thêm mong ước", (req, userId) => createBucket(userId, req.body));
export const toggleBucketController = controller("Đã cập nhật mong ước", (req, userId) => toggleBucket(userId, req.params.id));
export const deleteBucketController = controller("Đã xóa mong ước", (req, userId) => deleteBucket(userId, req.params.id));
export const listWalletController = controller("Ví chung", (_req, userId) => listWallet(userId));
export const createWalletController = controller("Đã ghi khoản chi", (req, userId) => createWallet(userId, req.body));
export const deleteWalletController = controller("Đã xóa khoản chi", (req, userId) => deleteWallet(userId, req.params.id));
export const listChallengesController = controller("Thử thách của hai đứa", (_req, userId) => listChallenges(userId));
export const createChallengeController = controller("Đã tạo thử thách", (req, userId) => createChallenge(userId, req.body));
export const checkinChallengeController = controller("Đã cập nhật check-in", (req, userId) => checkinChallenge(userId, req.params.id));
export const deleteChallengeController = controller("Đã xóa thử thách", (req, userId) => deleteChallenge(userId, req.params.id));
export const listCalendarEventsController = controller("Lịch hẹn", (_req, userId) => listCalendarEvents(userId));
export const createCalendarEventController = controller("Đã thêm lịch hẹn", (req, userId) => createCalendarEvent(userId, req.body));
export const updateCalendarEventController = controller("Đã cập nhật lịch hẹn", (req, userId) => updateCalendarEvent(userId, req.params.id, req.body));
export const deleteCalendarEventController = controller("Đã xóa lịch hẹn", (req, userId) => deleteCalendarEvent(userId, req.params.id));
export const listSongsController = controller("Playlist của tụi mình", (_req, userId) => listSongs(userId));
export const addSongController = controller("Đã thêm bài hát", (req, userId) => addSong(userId, req.body));
export const updateSongController = controller("Đã cập nhật bài hát", (req, userId) => updateSong(userId, req.params.id, req.body));
export const removeSongController = controller("Đã xóa bài hát", (req, userId) => removeSong(userId, req.params.id));
export const todayQuestionController = controller("Câu hỏi hôm nay", (_req, userId) => listQuestionAnswers(userId));
export const listQuizGamesController = controller("Trò chơi tâm sự", (_req, userId) => listQuizGames(userId));
export const createQuizGameController = controller("Đã tạo trò chơi tâm sự", (req, userId) => createQuizGame(userId, req.body));
export const getQuizGamePlayController = controller("Trò chơi tâm sự", (req, userId) => getQuizGameForPlay(userId, req.params.gameId));
export const getQuizGameReportController = controller("Báo cáo trò chơi", (req, userId) => getQuizGameReport(userId, req.params.gameId));
export const submitQuizGameAttemptController = controller("Đã nộp bài chơi", (req, userId) => submitQuizGameAttempt(userId, req.params.gameId, req.body));
export const createRoomQuizController = controller("Đã tạo câu hỏi tâm sự", (req, userId) => createRoomQuiz(userId, req.body));
export const submitAnswerController = controller("Đã lưu câu trả lời", (req, userId) => submitDailyAnswer(userId, req.body));
export const submitRoomQuizAnswerController = controller("Đã lưu câu trả lời", (req, userId) => submitRoomQuizAnswer(userId, req.params.quizId, req.body));
export const todayMoodsController = controller("Mood hôm nay", (_req, userId) => getTodayMoods(userId));
export const setMoodController = controller("Đã lưu mood hôm nay", (req, userId) => setTodayMood(userId, req.body));
export const listAlbumsController = controller("Album riêng", (_req, userId) => listAlbums(userId));
export const createAlbumController = controller("Đã tạo album", (req, userId) => createAlbum(userId, req.body));
export const addAlbumPhotoController = controller("Đã thêm ảnh", (req, userId) => addAlbumPhoto(userId, req.params.albumId, req.body));
export const deleteAlbumPhotoController = controller("Đã xóa ảnh", (req, userId) => deleteAlbumPhoto(userId, req.params.photoId));
export const listNotificationsController = controller("Thông báo riêng", (_req, userId) => listNotifications(userId));
export const markNotificationReadController = controller("Đã đọc thông báo", (req, userId) => markNotificationRead(userId, req.params.id));
export const markAllNotificationsReadController = controller("Đã đọc tất cả thông báo", (_req, userId) => markNotificationRead(userId));
