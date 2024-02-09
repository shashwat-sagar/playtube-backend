import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//step1 write conrtoller for the routes. Meaning it is a middleware or the functionalities that you want to perform while hitting the route
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
  // validation to check if the fields are empty or not
  // if (fullName === "" || username === "" || email === "" || password === "") {
  //   throw new ApiError(400, "All fields are required");
  // }

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "All fields are required");

  //email validation
  if (!email.include("@")) throw new ApiError(400, "Invalid Email");

  //check if user is already registered
  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) throw new ApiError(409, "User already exist");

  //check if avatar and coverImage is upload on local server or not
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
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

export { registerUser };
