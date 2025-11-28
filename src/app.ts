import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

import authRoutes from "./routes/auth";
import groupRoutes from "./routes/groups";
import taskRoutes from "./routes/tasks";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/tasks", taskRoutes);

export default app;
