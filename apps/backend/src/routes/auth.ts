import express from "express";
import passport from "passport";
import { requireAuth } from "../middleware/auth";

const router: express.Router = express.Router();

// GitHub OAuth login
router.get("/github", passport.authenticate("github", { scope: ["user:email", "repo"] }));

// GitHub OAuth callback
router.get("/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), (_req: express.Request, res: express.Response) => {
  res.redirect(process.env.CLIENT_ORIGIN || "http://localhost:4200");
});

// Current user
router.get("/me", requireAuth, (req: express.Request, res: express.Response) => {
  res.json(req.user);
});

// Logout
router.post("/logout", (req: express.Request, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.json({ message: "Logged out" });
  });
});

export default router;
