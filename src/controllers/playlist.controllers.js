import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    //TODO: create playlist

    if (!(name || description)) {
        throw new ApiError(400, "Name and description are required")
    }

    const newPlaylist = await  Playlist.create({
        name,
        description,
        owner: req.user._id,
    })

    

    return res
        .status(200)
    .json(new ApiResponse(201, newPlaylist, "Playlist created"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist required")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "playlist not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid PlaylistID or VideoID")
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(404, "playlist not fornd");
    }
    if (!video) {
        throw new ApiError(404, "video not found");
    }

    if ((playlist.owner?.toString() && video.owner.toString()) !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can add video to their playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
                
            },
        },
        {
            new:true
        }
    )

    if (!updatedPlaylist) {
        throw new ApiError(400, "failed to add video to playlist. Try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200, updatedPlaylist,
            "Video added to playlist successfully"
    ))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
