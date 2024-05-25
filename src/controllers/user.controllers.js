import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    // validation (alll things are correct or not empty )
    //check if user alreasy exists: username and email 
    // check for images, check for avatar
    //upload them to cloudinary, avatar
    // create user object- create entry in DB
    // remove pasword and refresh token fields from response
    //check for user creation
    //return res
    
    
    const { fullName, email, username, password } = req.body
    // console.log(("email: ", email));

    // if (fullName === "") {
    //     throw new ApiError(400, "full name is required")
    // }

    if (
        [fullName, email, username, password].some((field) =>
        field?.trim()==="")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "user with email or username already exists ")
    }

    //console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage  =coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar file required")
    }

    const user = await User.create({
        fullName, 
        
        coverImage: coverImage?.url || "",
        email,
        password,
        avatar: avatar.url,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTokens"

    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while regestring user ")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully ")
    )


});

const loginUser = asyncHandler(async (req, res) => {
    // get data from req body
    //username or email 
    // find the user 
    //password check
    // access and refresh token 
    // send cookies
    
    const { email, username, password } = req.body
    
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(400, "User does not exist")        
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "password incorect")        
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const option = {
        httpOnly: true,
        secure:true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(200, {
                user :loggedInUser, accessToken,refreshToken
            },
            "usser logges In succesfully ")
    )
    

})

const logoutUser = asyncHandler(async (req, res) => {
    //clear cookies
    //clear tokens
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTokens: undefined
                // refreshTokens: undefined
                
            }
        },
        {
            new:true
        }
    )

    const option = {
        httpOnly: true,
        secure:true
    }

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponse(200, {}, "User logged Out"))
    


})


const refreshAccessToken = asyncHandler(async (req, res) =>
{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedtoken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken?._id)
    
        if (!user) {
            throw new ApiError(401, "invalid User")
        }
    
        if (incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "invalid refresh token expired or used")
            
        }
    
    
        const options = {
            hrrpOnly: true,
            secure: true
        }
    
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newrefreshToken },
                    "Access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid error")
        
    }
    
    
}) 

const changeCurrentPassword = asyncHandler(async (req, res) =>
{
    const { oldPassword, newPassword } = req.body
    
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    
    return res.status(200)
    .json(new ApiResponse(200, {}, "password change successfully "))
})

const getCurrentUser = asyncHandler(async (req, res) =>
{
    return res.status(200)
    .json(new ApiResponse(200, req.user , "current user fetched succesfully "))
})

const updateAccoutDetails = asyncHandler(async (req, res) =>
{
    const { fullName, email } = req.body
    
    if (!(fullName || email)) {
        throw new ApiError(400, "All Fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Account updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) =>
{
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file not available")
        
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar : avatar.url
                }
            },
            { new: true }
            
    ).select("-password")
    

    return res
        .status(200)
        .json(new ApiResponse(200, user, "avatar updated succesfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) =>
{
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover Image file not available")
        
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover Image")
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage : coverImage.url
                }
            },
            { new: true }
            
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated succesfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) =>
{
    const { username } = req.params
    
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing ")
    }

    //User.find({username})

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size:"$subscribers"
                },
                channelSubscribedToCount: {
                    $size:"$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email:1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage:1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist ")
    }

    return res.status(200)
        .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )


})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully "))
})

export {
    registerUser,
    loginUser,
    logoutUser, refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccoutDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}
