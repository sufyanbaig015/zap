import express from "express";
import cors from "cors";
import session from "express-session";
import mongoose from "mongoose";
import passport from "passport";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import zapRoutes from "./routes/zaps";
import githubRoutes from "./routes/github";
import { configurePassport } from "./config/passport";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- MongoDB connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/zap";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("[db] connected to MongoDB"))
  .catch((err) => {
    console.error("[db] connection error:", err);
    process.exit(1);
  });

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:4200", credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

configurePassport();

// --- Routes ---
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/api/zaps", zapRoutes);
app.use("/api/github", githubRoutes);

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
