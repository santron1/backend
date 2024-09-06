import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
//import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return{accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req,res) =>{
    //user detail from frontend
    //check validation - not empty
    //check if user already exists: username, email
    //image check, avatar check
    //upload them to cloudinary
    //create user object - create entry in db
    //remove password & refresh token field from response
    //check for user creation
    //retrun res


    const {fullName, email, username, password} = req.body
    
    if(
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists")
    }
    const avatarLocalPath= req.files?.avatar[0]?.path;
    //const coverImageLocalPath= req.files?.coverImage[0]?.path;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath= req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar not found, it is must")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar not found, it is must")
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new ApiError(500,"Something went wrong while registering user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registed succesfuly")
    )
})

const loginUser = asyncHandler(async(req,res)=>{
    //req body -> data
    //username or email
    //find the user
    //password check
    //access and referesh token
    //send cokie

    const {email,username,password} = req.body
    if (!username || !email) {
        throw new ApiError(400,"Username or Email is required")
    }
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if (!user) {
        throw new ApiError(404,"User doesn't exist")
    }
    const isPasswordValid= await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(404,"Invalid User, what is this vro not expected")
    }
    const {accessToken, refreshToken}= await generateAccessAndRefereshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accesstoken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )
})
const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken: undefined}
        },
        {
            next: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200,{},"User logged Out Success"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}