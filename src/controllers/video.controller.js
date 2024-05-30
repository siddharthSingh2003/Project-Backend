import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if (
        [title, description].some((field) =>
        field?.trim()==="")
    ) {
        throw new ApiError(400, "All fields Required")
    }

    const videolocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videolocalPath) {
        throw new ApiError(400,"Video file is required")
    }

    try {
        const videoFile = await uploadOnCloudinary(videolocalPath);
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    
        if (!videoFile) {
            throw new ApiError(400, "Video file not found ")
        }
        if (!thumbnail) {
            throw new ApiError(400, "thumbnail not found ")
        }
    
        const videoDuration = videoFile.duration;
    
    
        const video = await Video.create({
            title,
            description,
            videoFile : videoFile.url,
            thumbnail: thumbnail.url,
            duration: videoDuration,
            owner : req.user._id
        })
    
        const uploadedVideo = await Video.findById(video._id).populate("owner", "-password")
    
        if (!uploadedVideo) {
            throw new ApiError(500, "something went wrong while uploading video")
        }
    
        return res.status(201)
            .json(  new ApiResponse(200, uploadedVideo,"Video uploaded Successfully "))
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error")
        
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!videoId) {
        throw new ApiError(400,"video not found")
    }

    try {
        const video = await Video.findById(videoId);

    
        if (!video) {
            throw new ApiError(400, "video not found")
        }
        console.log(video);
        return res.status(200)
        .json(new ApiResponse(200, video, "Video fetched Successfully"))
    } catch (error) {
        throw new ApiError(500, "Intenal Server Error")
    }




})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if (!videoId) {
        throw new ApiError(400, "Video not found")
    }
    
    
    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail not given")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail.url) {
        throw new ApiError(400, "Error while uploading thumbnail")
    }

    const updatevideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnail.url
            }
        },
        {new:true, runValidators:true}
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatevideo, "thumbanail updated successfully"))
    
    

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!videoId) {
        throw new ApiError(400, "video does not exist")
    }
    

    try {
       
        const video = await Video.findById(videoId);

        if (!video) {
            throw new ApiError(404, "video not found");
        }
        
        if (video.owner.toString() !== req.user._id.toString()) {
            
            throw new ApiError(403, "You are not authorized to delete this video");
        }
        console.log("wrong user");
        await Video.findByIdAndDelete(videoId);
        
        return res.status(200)
            .json(new ApiResponse(200, "Video deleted"));
    } catch (error) {
        throw new ApiError(500, error.message ||"Internal Server error");
    }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "video not found")


    }

    try {
        const video = await Video.findById(videoId)
    
        if (!video) {
            throw new ApiError(400, "Video not found")
        }
        
        if (video.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to toggel this video ")
        }
        if (video.isPublished) {
            video.isPublished =!video.isPublished;
        }
        else if (!video.isPublished){
            video.isPublished = true
        }
    
        await video.save()
    
        return res.status(200)
        .json(new ApiResponse(200, video.isPublished, "toggle done "))
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
