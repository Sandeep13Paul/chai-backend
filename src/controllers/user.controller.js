import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token and refresh token");
    }
}

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
    // console.log(req.body);

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

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // console.log(req.files);

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
});

// const loginUser = asyncHandler( async (req, res) => {
//     // user first fills all the fields
//     // we try to get the user info from the form field req.body
//     // we then check if all the required fields are properly filled or not and return a valid error
//     // we then check if the user is present in the database or not
//     //if present using the refresh and access tokrn the user is redirected to the dashboard
//     // else we tell the user to register
//     // update it on database send through cookies

//     const {email, username, password} = req.body;

//     if (!(username || email)) {
//         throw new ApiError(400, "Username or email is required");
//     }

//     const user = await User.findOne({
//         $or: [{username}, {email}]
//     });

//     if (!user) {
//         throw new ApiError(404, "User not found");
//     }

//     const isPasswordValid = await user.isPasswordCorrect(password);

//     if (!isPasswordValid) {
//         throw new ApiError(401, "Invalid password");
//     }

//     const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

//     const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

//     const options = {
//         httpOnly: true,
//         secure: true,
//     }

//     return res.status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(
//             200, 
//             {
//                 user: loggedInUser,
//                 accessToken: accessToken,
//                 refreshToken: refreshToken
//             },
//             "User logged in successfully"
//         )
//     );
// });

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    // Log received credentials
    // console.log("Received credentials:", { email, username });

    // Ensure that either email or username is provided
    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    // Find the user based on email or username
    const user = await User.findOne({ $or: [{ username }, { email }] });

    // Log found user
    // console.log("Found user:", user);

    // If user is not found, throw 404 error
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Verify the password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    // Generate access and refresh tokens
    // console.log("Generating tokens for user:", user._id);
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Log generated tokens
    // console.log("Generated tokens:", { accessToken, refreshToken });

    // Send the tokens in the response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            { user: loggedInUser, accessToken, refreshToken },
            "User logged in successfully"
        ));
});

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            }
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
    .json(
        new ApiResponse(
            200,
            {

            },
            "User Logged out successfully"
        )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
            // Throw error if user is not found
            if (!user) {
                throw new ApiError(401, "Invalid Refresh Token");
            }
    
            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh Token is expired or invalid");
            }
    
            const options = {
                httpOnly: true,
                secure: true
            };
    
            const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access Token Refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body;

    if (!(newPassword === confirmPassword)) {
        throw new ApiError(401, "confirmPassword should be same as new password");
    }

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password updated successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                user: req.user
            },
            "currentUser fetched successfully"
        )
    )
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "all fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "account details updated"
        )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file not found');
    }

    // delete old from db
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, 'Error while uploading avatar');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select('-password');

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar updated successfully"
        )
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, 'CoverImage file not found');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, 'Error while uploading cover image');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select('-password');

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "coverImage updated successfully"
        )
    );
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
    updateUserCoverImage
};