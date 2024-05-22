import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access ad refresh tokens")
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
    
    if (!username || !email) {
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
                refreshTokens:undefined
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

export {
    registerUser,
    loginUser,
    logoutUser}