import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({message: "OK"});
    //step 1: user gives the cerdentials in the register form
    // Step 2: then the data is taken from the form and also checked if the user has give all
    // the required information
    // Step 3: we check if the user's credentials are already registered in the database or not 
    // if present we give the the message that the given credentials are already registered
    // can't use the same credentials
    // step 4: if the user is not registered then we save the credentials in the database and send 
    // a notification that the user has successfully registered
    // remove password and refresh token from the response
    
    const {username, email, password, fullname} = req.body;
    console.log("username = " + username + "\n" + "email = " + email + "\n" + "password = " + password);

    // if (fullname === "") {
    //     throw new ApiError(400, "full name is required");
    // }
    if (
        [username, email, password, fullname].some((field) => (field?.trim() === ""))
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (!email.includes("@") && !email.includes(".")) {
        throw new ApiError(400, "please provide with the correct email");
    }

    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Missing avatar");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Missing avatar");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    )
})

export {registerUser};