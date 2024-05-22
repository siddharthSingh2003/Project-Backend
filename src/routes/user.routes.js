import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

// console.log('registerUser:', registerUser); 
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser)


router.route("/login").post(loginUser)

//secured Routes

router.route("/logout").post(verifyJWT, logoutUser)



export default router;