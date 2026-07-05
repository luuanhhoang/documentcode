import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getMyProfile, updateMyAvatar, updateMyProfile } from "../services/profileService.js";
import { avatarPublicPath, avatarUpload, coupleAvatarPublicPath, coupleAvatarUpload } from "../services/uploadService.js";
import { fail, ok } from "../utils/apiResponse.js";

export const profileRoutes = Router();

profileRoutes.use(requireAuth);

profileRoutes.get("/profile/me", async (req, res, next) => {
  try {
    if (!req.userId) {
      fail(res, 401, "Vui lòng đăng nhập");
      return;
    }

    ok(res, "Hồ sơ cá nhân", { profile: await getMyProfile(req.userId) });
  } catch (error) {
    next(error);
  }
});

profileRoutes.put("/profile/me", async (req, res, next) => {
  try {
    if (!req.userId) {
      fail(res, 401, "Vui lòng đăng nhập");
      return;
    }

    ok(res, "Đã cập nhật hồ sơ", { profile: await updateMyProfile(req.userId, req.body) });
  } catch (error) {
    next(error);
  }
});

profileRoutes.post("/profile/avatar", avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.userId) {
      fail(res, 401, "Vui lòng đăng nhập");
      return;
    }

    if (!req.file) {
      fail(res, 400, "Vui lòng chọn ảnh");
      return;
    }

    ok(res, "Đã cập nhật avatar", { profile: await updateMyAvatar(req.userId, avatarPublicPath(req.file.filename)) });
  } catch (error) {
    next(error);
  }
});

profileRoutes.post("/uploads/avatar", avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      fail(res, 400, "Vui lòng chọn ảnh");
      return;
    }

    ok(res, "Đã tải ảnh", { avatarUrl: avatarPublicPath(req.file.filename) });
  } catch (error) {
    next(error);
  }
});

profileRoutes.post("/uploads/couple-avatar", coupleAvatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      fail(res, 400, "Vui lòng chọn ảnh");
      return;
    }

    ok(res, "Đã tải ảnh", { avatarUrl: coupleAvatarPublicPath(req.file.filename) });
  } catch (error) {
    next(error);
  }
});
