import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const commentsAggregrate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
                
            }
        },
        {
            $lookup: {
                from: "user",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                
            },
        },
        {
            $lookup: {
                
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
                
            },
            
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullname: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregrate,
        options
    );

    return res.status(200)
        .json(new ApiResponse(200, comments, "Comments fetched Successfully"))
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner:req.user?._id,
    })

    if (!comment) {
        throw new  ApiError(500, "Failed to add comment please try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment added succesfully"))
    

})

const updateComment = asyncHandler(async (req, res) => {
    
    const { content } = req.body;
    const { commentId } = req.params;

    if (!content) {
        throw new ApiError(404, "content is required")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commnet id")
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can edit comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(500, "couldn't update comment try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
   
    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(400, "comment id required")
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(400, "comment not found")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "only owner can delete comment")
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200)
    .json(new ApiResponse(200, "commnent deleted"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
