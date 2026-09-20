import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateCoverImage,
  updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// Secured Route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/changeCurrentPassword").post(verifyJWT, changeCurrentPassword);
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);
router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails);
router
  .route("/updateUserAvatar")
  .post(upload.single("avatar"), verifyJWT, updateUserAvatar);

router
  .route("/updateCoverImage")
  .post(upload.single("coverImage"), verifyJWT, updateCoverImage);
export default router;
