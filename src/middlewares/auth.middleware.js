// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";

// export const verifyJWT = asyncHandler(async(req, _, next) => {
//     try {
//         console.log(req.cookies.accessToken);
//         console.log(req.header("Authorization"));
//         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
//         console.log(token);
//         if (!token) {
//             throw new ApiError(401, "Unauthorized request")
//         }
    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
//         if (!user) {
            
//             throw new ApiError(401, "Invalid Access Token")
//         }
    
//         req.user = user;
//         next();
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid access token")
//     }
    
// })


// import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// export const verifyJWT = asyncHandler(async (req, res, next) => {
//     try {
//         let token;

//         // Check if the token is present in cookies or headers
//         if (req.cookies && req.cookies.accessToken) {
//             token = req.cookies.accessToken;
//         } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
//             // Extract token from Authorization header
//             token = req.headers.authorization.split(" ")[1];
//         }

//         // Log the token value for debugging
//         console.log("Token:", token);

//         // Throw error if token is missing
//         if (!token) {
//             throw new ApiError(401, "Unauthorized request");
//         }

//         // Verify the JWT token
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//         // Find user based on decoded token's _id
//         const user = await User.findById(decodedToken._id).select("-password -refreshToken");

//         // Throw error if user is not found
//         if (!user) {
//             throw new ApiError(401, "Invalid Access Token");
//         }

//         // Attach user object to request
//         req.user = user;

//         // Call next middleware
//         next();
//     } catch (error) {
//         // Forward error to error handling middleware
//         next(new ApiError(401, error.message || "Invalid access token"));
//     }
// });


import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        console.log("Access token secret:", process.env.ACCESS_TOKEN_SECRET);
        const tokenFromCookies = req.cookies?.accessToken;
        const tokenFromHeader = req.header("Authorization")?.replace("Bearer ", "");
        console.log("Token from cookies:", tokenFromCookies);
        console.log("Token from header:", tokenFromHeader);
        const token = tokenFromCookies || tokenFromHeader;
        console.log("Final token:", token);

        // Throw error if token is missing
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify the JWT token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find user based on decoded token's _id
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        // Throw error if user is not found
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // Attach user object to request
        req.user = user;

        // Call next middleware
        next();
    } catch (error) {
        // Forward error to error handling middleware
        next(new ApiError(401, error.message || "Invalid access token"));
    }
});
