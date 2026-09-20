import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// STEPS
// Take req from body
// Validation
// Check for already registered
// Check for images, check for avatar

// take file for avatar and store it in cloudinary and get the url
// take all data and save it to MongoDB
// give the response with _id

const generateAccessOrRefreshToken = async (userId) => {
  let user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

  // Validation
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check existing user
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Get local file paths - which we get from Multer
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // Avatar required
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // Upload avatar
  const avatarUrl = await uploadOnCloudinary(avatarLocalPath);

  // Upload cover image only if provided
  const coverImageUrl = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  // Make sure avatar uploaded
  if (!avatarUrl) {
    throw new ApiError(400, "Avatar upload failed");
  }

  // Create user
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    avatar: avatarUrl.url,
    coverImage: coverImageUrl?.url || "",
  });

  console.log("user =", user);

  if (!user?._id) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user._id, "User registeded successfully"));
});

// Take email and password
// Check valid email and password
//  Check if your exist or not by email
// Check if password is correct or not
// generate Access and Refresh token
// Send secure cookies

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email?.trim() && !username?.trim()) {
    throw new ApiError(400, "Email or username is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [
      ...(email ? [{ email: email.toLowerCase() }] : []),
      ...(username ? [{ username: username.toLowerCase() }] : []),
    ],
  });

  if (!user) {
    throw new ApiError(400, "User did not exist");
  }

  const isValidPassword = await user.isPasswordCorrect(password);

  if (!isValidPassword) {
    throw new ApiError(400, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessOrRefreshToken(
    user._id
  );

  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  ).select("-password");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, user, "User loogedOut successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  console.log("refresh token Hitting....");

  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    const { refreshToken: newRefreshToken, accessToken } =
      await generateAccessOrRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Something went wrong while refreshing access token"
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const userId = req.user?.id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, "Unauthorized user!");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName.trim() || !email.trim()) {
    throw new Error("Fullname and Email are required.");
  }

  const user = await User.findByIdAndUpdate(
    req.user?.id,
    { $set: { email: email, fullName: fullName } },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "User account updated succfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading Avatar");
  }

  const user = await User.findById(req.user?.id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  user.avatar = avatar?.url;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, user, "Avatar updated succfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file not found");
  }

  const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImageUpload?.url) {
    throw new ApiError(400, "Cover Image upload failed while updating");
  }

  const user = await User.findById(req.user?.id);

  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  user.coverImage = coverImageUpload?.url;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated succfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
};
