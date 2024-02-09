import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
//step2 write the route where you want to achieve the functionality written in previous step i.e controller
router.route("/register").post(
  //middleware use i.e upload from multer
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  // controller
  registerUser
);

export default router;
