import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler((req, res) => {
  return res.status(201).json({
    success: true,
    message: "ok",
  });
});

export { registerUser };
