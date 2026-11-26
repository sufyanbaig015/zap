import express from "express";
import { requireAuth } from "../middleware/auth";
import Zap, { IZapAction } from "../models/Zap";
import ZapRun from "../models/ZapRun";
import { ensureGitHubWebhook } from "../services/githubWebhook";

const router: express.Router = express.Router();

router.use(requireAuth);

function sanitizeAction(raw: Partial<IZapAction> | undefined): IZapAction {
  return {
    app: raw?.app || "",
    event: raw?.event || "",
    repository: raw?.repository || "",
    config: {
      commentBody: raw?.config?.commentBody || "",
      label: raw?.config?.label || "",
      issueTitle: raw?.config?.issueTitle || "",
      issueBody: raw?.config?.issueBody || "",
    },
  };
}

function normalizeActions(actions: unknown, legacyAction: unknown): IZapAction[] {
  if (Array.isArray(actions) && actions.length > 0) {
    return actions.map((a) => sanitizeAction(a as Partial<IZapAction>));
  }
  if (legacyAction && typeof legacyAction === "object") {
    return [sanitizeAction(legacyAction as Partial<IZapAction>)];
  }
  return [sanitizeAction(undefined)];
}

// List all Zaps belonging to the signed-in user
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const zaps = await Zap.find({ userId: req.user!.id }).sort({ updatedAt: -1 });
    res.json(zaps);
  } catch (err) {
    console.error("[zaps] list error:", err);
    res.status(500).json({ error: "Failed to load Zaps" });
  }
});

// Get a single Zap by ID (scoped to user)
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const zap = await Zap.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }
    let webhookWarning: string | undefined;
    if (zap.enabled && zap.trigger.app === "github" && zap.trigger.repository) {
      const hookResult = await ensureGitHubWebhook(req.user!.accessToken, zap.trigger.repository);
      webhookWarning = hookResult.warning;
    }
    res.json({ ...zap.toObject(), ...(webhookWarning ? { webhookWarning } : {}) });
  } catch (err) {
    console.error("[zaps] get error:", err);
    res.status(500).json({ error: "Failed to load Zap" });
  }
});

// Create a new Zap
router.post("/", async (req: express.Request, res: express.Response) => {
  try {
    const { name, enabled, trigger, actions, action } = req.body;
    const normalizedActions = normalizeActions(actions, action);
    const zap = await Zap.create({
      userId: req.user!.id,
      name: typeof name === "string" && name.trim() ? name.trim() : "Untitled Zap",
      enabled: Boolean(enabled),
      trigger: {
        app: trigger?.app || "",
        event: trigger?.event || "",
        repository: trigger?.repository || "",
      },
      actions: normalizedActions,
      action: normalizedActions[0],
    });
    let webhookWarning: string | undefined;
    if (zap.enabled && zap.trigger.app === "github" && zap.trigger.repository) {
      const hookResult = await ensureGitHubWebhook(req.user!.accessToken, zap.trigger.repository);
      webhookWarning = hookResult.warning;
    }
    res.status(201).json({ ...zap.toObject(), ...(webhookWarning ? { webhookWarning } : {}) });
  } catch (err) {
    console.error("[zaps] create error:", err);
    res.status(500).json({ error: "Failed to create Zap" });
  }
});

// Update an existing Zap
router.put("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const { name, enabled, trigger, actions, action } = req.body;
    const hasActionsUpdate = actions !== undefined || action !== undefined;
    const normalizedActions = hasActionsUpdate ? normalizeActions(actions, action) : undefined;

    const zap = await Zap.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      {
        $set: {
          ...(name !== undefined && { name: typeof name === "string" && name.trim() ? name.trim() : "Untitled Zap" }),
          ...(enabled !== undefined && { enabled: Boolean(enabled) }),
          ...(trigger !== undefined && {
            trigger: {
              app: trigger?.app || "",
              event: trigger?.event || "",
              repository: trigger?.repository || "",
            },
          }),
          ...(normalizedActions !== undefined && {
            actions: normalizedActions,
            action: normalizedActions[0],
          }),
        },
      },
      { new: true },
    );

    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }
    let webhookWarning: string | undefined;
    if (zap.enabled && zap.trigger.app === "github" && zap.trigger.repository) {
      const hookResult = await ensureGitHubWebhook(req.user!.accessToken, zap.trigger.repository);
      webhookWarning = hookResult.warning;
    }
    res.json({ ...zap.toObject(), ...(webhookWarning ? { webhookWarning } : {}) });
  } catch (err) {
    console.error("[zaps] update error:", err);
    res.status(500).json({ error: "Failed to update Zap" });
  }
});

// Toggle Zap enabled state
router.patch("/:id/toggle", async (req: express.Request, res: express.Response) => {
  try {
    const zap = await Zap.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }
    zap.enabled = req.body?.enabled !== undefined ? Boolean(req.body.enabled) : !zap.enabled;
    await zap.save();
    let webhookWarning: string | undefined;
    if (zap.enabled && zap.trigger.app === "github" && zap.trigger.repository) {
      const hookResult = await ensureGitHubWebhook(req.user!.accessToken, zap.trigger.repository);
      webhookWarning = hookResult.warning;
    }
    res.json({ ...zap.toObject(), ...(webhookWarning ? { webhookWarning } : {}) });
  } catch (err) {
    console.error("[zaps] toggle error:", err);
    res.status(500).json({ error: "Failed to toggle Zap" });
  }
});

// Delete a Zap
router.delete("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const zap = await Zap.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!zap) {
      res.status(404).json({ error: "Zap not found" });
      return;
    }
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error("[zaps] delete error:", err);
    res.status(500).json({ error: "Failed to delete Zap" });
  }
});

// List run logs for a Zap
router.get("/:id/runs", async (req: express.Request, res: express.Response) => {
  try {
    const runs = await ZapRun.find({ zapId: req.params.id, userId: req.user!.id })
      .sort({ startedAt: -1 })
      .limit(50);
    res.json(runs);
  } catch (err) {
    console.error("[zaps] runs list error:", err);
    res.status(500).json({ error: "Failed to load run logs" });
  }
});

// Get a single run's detailed logs
router.get("/:id/runs/:runId", async (req: express.Request, res: express.Response) => {
  try {
    const run = await ZapRun.findOne({
      _id: req.params.runId,
      zapId: req.params.id,
      userId: req.user!.id,
    });
    if (!run) {
      res.status(404).json({ error: "Run log not found" });
      return;
    }
    res.json(run);
  } catch (err) {
    console.error("[zaps] run detail error:", err);
    res.status(500).json({ error: "Failed to load run log" });
  }
});

export default router;
