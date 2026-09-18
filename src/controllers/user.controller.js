import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// STEPS
// Take req from body
// Validation
// Check for already registered
// Check for images, check for avatar

// take file for avatar and store it in cloudinary and get the url
// take all data and save it to MongoDB
// give the response with _id
// generateRefreshToken
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

  // Get local file paths
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

export { registerUser };
