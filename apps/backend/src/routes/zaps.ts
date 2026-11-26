import express from "express";
import { requireAuth } from "../middleware/auth";
import Zap from "../models/Zap";
import { createRepoWebhook, listUserRepos } from "../services/github";

const router: express.Router = express.Router();

// All zap routes require authentication
router.use(requireAuth);

// GET /api/zaps - List all zaps for the signed-in user
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const zaps = await Zap.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json(zaps);
  } catch (err) {
    console.error("[zaps] list error:", err);
    res.status(500).json({ error: "Failed to load zaps" });
  }
});

// GET /api/zaps/repos - List GitHub repositories for the signed-in user
router.get("/repos", async (req: express.Request, res: express.Response) => {
  try {
    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      res.status(400).json({ error: "GitHub access token missing. Please sign in again." });
      return;
    }

    const repos = await listUserRepos(accessToken);
    res.json(
      repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
      })),
    );
  } catch (err) {
    console.error("[zaps] repos error:", err);
    res.status(500).json({ error: "Failed to fetch GitHub repositories" });
  }
});

// POST /api/zaps - Create a new zap and register GitHub webhook
router.post("/", async (req: express.Request, res: express.Response) => {
  try {
    const { name, repoFullName, repoId, event, action, actionConfig, enabled } = req.body;

    if (!name || !repoFullName || !repoId || !event || !action) {
      res.status(400).json({ error: "Missing required zap fields" });
      return;
    }

    const accessToken = req.user?.accessToken;
    const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.BACKEND_URL || "http://localhost:4000";
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/github`;
    const isLocalhost = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

    let webhookId: number | undefined;
    let webhookStatus: "active" | "local_only" | "error" = "active";
    let webhookError: string | undefined;

    if (isLocalhost) {
      webhookStatus = "local_only";
      webhookError = "Set WEBHOOK_BASE_URL to a public URL (e.g. ngrok) for live GitHub webhooks.";
    } else if (accessToken) {
      try {
        const hook = await createRepoWebhook(
          accessToken,
          repoFullName,
          webhookUrl,
          process.env.GITHUB_WEBHOOK_SECRET,
        );
        webhookId = hook.id;
        webhookStatus = "active";
      } catch (hookErr) {
        console.warn("[zaps] webhook registration warning:", hookErr);
        webhookStatus = "error";
        webhookError = hookErr instanceof Error ? hookErr.message : "Webhook registration failed";
      }
    }

    const zap = await Zap.create({
      userId: req.user!.id,
      name: String(name).trim(),
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      repoFullName,
      repoId: Number(repoId),
      event,
      action,
      actionConfig: {
        commentBody: actionConfig?.commentBody || "Thanks for opening this pull request!",
      },
      webhookId,
      webhookStatus,
      webhookError,
    });

    res.status(201).json(zap);
  } catch (err) {
    console.error("[zaps] create error:", err);
    res.status(500).json({ error: "Failed to create zap" });
  }
});

// PATCH /api/zaps/:id - Update zap (toggle enabled, update name/config)
router.patch("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const { name, enabled, event, action, actionConfig } = req.body;
    const updateFields: Record<string, unknown> = {};

    if (name !== undefined) updateFields.name = String(name).trim();
    if (enabled !== undefined) updateFields.enabled = Boolean(enabled);
    if (event !== undefined) updateFields.event = event;
    if (action !== undefined) updateFields.action = action;
    if (actionConfig !== undefined) {
      updateFields.actionConfig = actionConfig;
    }

    const zap = await Zap.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { $set: updateFields },
      { new: true },
    );

    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }

    res.json(zap);
  } catch (err) {
    console.error("[zaps] update error:", err);
    res.status(500).json({ error: "Failed to update zap" });
  }
});

// DELETE /api/zaps/:id - Delete a zap
router.delete("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const zap = await Zap.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }
    res.json({ message: "Zap deleted" });
  } catch (err) {
    console.error("[zaps] delete error:", err);
    res.status(500).json({ error: "Failed to delete zap" });
  }
});

export default router;
