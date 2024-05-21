import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

// console.log('registerUser:', registerUser); 
const router = Router()

router.route("/register").post(registerUser)

export default router;