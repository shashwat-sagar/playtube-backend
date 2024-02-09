import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: `${process.env.REQ_PAYLOAD_SIZE}` }));
app.use(
  express.urlencoded({
    extended: true,
    limit: `${process.env.REQ_PAYLOAD_SIZE}`,
  })
);
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";

//routes declaration
//step 3: write the full route here
//http://localhost:8000/api/v1/users

app.use("/api/v1/users", userRouter);

export { app };
