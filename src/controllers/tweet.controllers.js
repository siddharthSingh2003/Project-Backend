import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { response } from "express";
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweet) {
        throw new ApiError(500, "failed to create tweet please try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet created successfully"));
    

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params
    
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    try {
        const tweets = await Tweet.aggregate([
            // Match tweets by the userId
            {
                $match: { owner: new mongoose.Types.ObjectId(userId) }
            },
            // Lookup user details and exclude password
            {
                $lookup: {
                    from: 'users', // Collection name in MongoDB
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'ownerDetails'
                }
            },
            // Unwind the ownerDetails array
            {
                $unwind: '$ownerDetails'
            },
            // Project the fields to include and exclude password
            {
                $project: {
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: '$ownerDetails._id',
                        name: '$ownerDetails.name',
                        email: '$ownerDetails.email'
                    }
                }
            },
            // Sort by creation date descending
            {
                $sort: { createdAt: -1 }
            }
        ]);

        if (!tweets || tweets.length === 0) {
            throw new ApiError(404, "No tweets found for this user");
        }

        return res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Error");
    }




})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    
    const { content } = req.body;
    const { tweetId } = req.params;


    if (!content) {
        throw new ApiError(400, "content is required");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can edit thier tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!newTweet) {
        throw new ApiError(500, "Failed to edit tweet please try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
    
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params
    
    if (!tweetId) {
        throw new ApiError(400, "tweet does not exist")
    }

    try {
        const tweet = await Tweet.findById(tweetId);
    
        if (!tweet) {
            throw new ApiError(404, "Tweet not found, ERROR!!")
        }
    
        if (tweet.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to edit this tweet")
        }
    
        await Tweet.findByIdAndDelete(tweetId);
    
        return res.status(200)
            .json(new ApiResponse(200, "Tweet deleted"))
    } catch (error) {
        throw new ApiError(500, error.message || "Internal Server Message")
    }
    
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
