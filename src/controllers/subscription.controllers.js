import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const userId = req.user._id;

    if (!channelId) {
        throw new ApiError(400, "channelId Required")
    }

    // check if subscription already exists
    const exsistingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel :channelId
    })

    if (exsistingSubscription) {
        await Subscription.findByIdAndDelete(exsistingSubscription._id);
        return res.status(200)
        .json(new ApiResponse(200, null, "Unsubscribed Successfully"))
    }
    else {
        const newSubscription = await Subscription.create({
            subscriber: userId,
            channel:channelId
        })
        return res.status(200).json(new ApiResponse(200, newSubscription, "Subscribed Successfully"))
    }
    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    channelId = new mongoose.Types.ObjectId(channelId);

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel:channelId,
            }
        }
    ])
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}