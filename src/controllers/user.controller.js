import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  removeFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import fs from "fs";

//step1 write conrtoller for the routes. Meaning it is a middleware or the functionalities that you want to perform while hitting the route
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

//Register controller
const registerUser = asyncHandler(async (req, res) => {
  //+step a: get user details from frontend. i.e: username, email, fullName, avatar, coverImage, password
  //+step a.1: validation for not empty or email
  //+step a.2: check if user already exists:using username, email
  //+step a.3: check for images, check for avatar
  //+step a.4: upload it to cloudinary, avatar check if uploaded or not, and get the url
  //+step a.5: create user object -  create entry in db
  //+step a.6: remove password and refresh token field from response
  //+step a.7: check for user creation
  //+step a.8: return response

  const { username, fullName, email, password } = req.body;
  // console.log(req.body);
  // validation to check if the fields are empty or not
  // if (fullName === "" || username === "" || email === "" || password === "") {
  //   throw new ApiError(400, "All fields are required");
  // }

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "All fields are required");

  //email validation
  if (!email.includes("@")) throw new ApiError(400, "Invalid Email");

  //check if user is already registered
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) throw new ApiError(409, "User already exist");
  // console.log(req.files);
  //check if avatar and coverImage is upload on local server or not
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  //upload file to cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  //create user object in Database
  const user = await User.create({
    email,
    username: username.toLowerCase(),
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registring a new user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered succesfully"));
});

//login controller
const loginUser = asyncHandler(async (req, res) => {
  //login user controller
  //+step1: get user details from frontend i.e: Username/email and password
  //+step2: validation for not empty fields and email validation
  //+step3: check if user is registered or not using username, email
  ////+ step3.A: if not then return error with user to get registered
  ////- step3.B: else match password
  //step4: generate access token and refresh token, save it to db and
  ////step4.Asend it to user using cookie
  const { username, email, password } = req.body;
  if ([email || username, password].some((field) => field?.trim() === ""))
    throw new ApiError(400, "All fields are required");
  // if (!email.includes("@"))
  //   throw new ApiError(400, "Invalid Email");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user)
    throw new ApiError(
      404,
      "User not found. Please check your username/email or register for an account"
    );
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentails");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged In successfully"
      )
    );
});

//logout controller
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//refreshAccessToken
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken)
    throw new ApiError(401, "Unauthorized Request or Invalid Refresh Token");
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user)
      throw new ApiError(401, "Unauthorized Request or Invalid Refresh Token");
    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Refresh token is Expired or used");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//change password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect)
    throw new ApiError("401", "Current password is incorrect");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//get  user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

//update user details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Acount details updated successfully"));
});

//update files

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) throw new ApiError(400, "Error while uploading");
  const user = await User.findById(req.user?._id);
  const userUpload = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  await removeFromCloudinary(user.avatar);

  return res
    .status(200)
    .json(
      new ApiResponse(200, userUpload, "Avatar Image updated successfully")
    );
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) throw new ApiError(400, "Cover Image file is missing");
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  if (!coverImage.url) throw new ApiError(400, "Error while uploading");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
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
  updateUserCoverImage,
};
