import { Router } from "express";
import { mysqlPool } from "../database/mysqlPool.js";
import { getCurrentCoupleRoom } from "../middlewares/coupleRoom.js";
import { requireAuth } from "../middlewares/auth.js";
import { coupleImageFilePath, coupleImagePublicPath } from "../services/coupleUploadService.js";
import { avatarFilePath, coupleAvatarFilePath } from "../services/uploadService.js";
import { fail } from "../utils/apiResponse.js";
export const mediaRoutes = Router();
mediaRoutes.get("/media/avatars/:fileName", (req, res) => {
    const fileName = req.params.fileName;
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(fileName)) {
        fail(res, 404, "Không tìm thấy ảnh");
        return;
    }
    res.sendFile(avatarFilePath(fileName));
});
mediaRoutes.get("/media/couple-avatars/:fileName", requireAuth, async (req, res, next) => {
    try {
        if (!req.userId) {
            fail(res, 401, "Vui lòng đăng nhập");
            return;
        }
        const fileName = req.params.fileName;
        if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(fileName)) {
            fail(res, 404, "Không tìm thấy ảnh");
            return;
        }
        res.sendFile(coupleAvatarFilePath(fileName));
    }
    catch (error) {
        next(error);
    }
});
mediaRoutes.get("/media/couple-images/:fileName", requireAuth, async (req, res, next) => {
    try {
        if (!req.userId) {
            fail(res, 401, "Vui lòng đăng nhập để tiếp tục");
            return;
        }
        const room = await getCurrentCoupleRoom(req.userId);
        if (!room) {
            fail(res, 428, "Bạn cần tạo hoặc tham gia phòng riêng trước");
            return;
        }
        const fileName = req.params.fileName;
        if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/i.test(fileName)) {
            fail(res, 404, "Không tìm thấy ảnh");
            return;
        }
        const imageUrl = coupleImagePublicPath(fileName);
        const [rows] = await mysqlPool.query(`
        select id from memories where image_url = ? and couple_room_id = ?
        union all
        select id from album_photos where image_url = ? and couple_room_id = ?
        limit 1
      `, [imageUrl, room.id, imageUrl, room.id]);
        if (!rows[0]) {
            fail(res, 404, "Không tìm thấy ảnh trong phòng của bạn");
            return;
        }
        res.sendFile(coupleImageFilePath(fileName));
    }
    catch (error) {
        next(error);
    }
});
