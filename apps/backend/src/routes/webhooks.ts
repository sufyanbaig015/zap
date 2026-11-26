import express from "express";
import crypto from "crypto";
import Zap from "../models/Zap";
import User from "../models/User";
import { postIssueOrPrComment } from "../services/github";

const router: express.Router = express.Router();

function verifySignature(payload: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// POST /api/webhooks/github - Receive GitHub webhook events and run matching Zaps
router.post("/github", async (req: express.Request, res: express.Response) => {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.header("x-hub-signature-256");
      const rawBody = JSON.stringify(req.body);
      if (!verifySignature(rawBody, signature, secret)) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    const githubEvent = req.header("x-github-event");
    const payload = req.body;

    if (githubEvent === "ping") {
      res.json({ message: "pong" });
      return;
    }

    const repoFullName: string | undefined = payload?.repository?.full_name;
    if (!repoFullName) {
      res.status(400).json({ error: "Missing repository in payload" });
      return;
    }

    // Map GitHub event + action to our internal event key
    let eventKey: string | null = null;
    let issueNumber: number | undefined;

    if (githubEvent === "pull_request" && payload?.action === "opened") {
      eventKey = "pull_request.opened";
      issueNumber = payload?.pull_request?.number || payload?.number;
    } else if (githubEvent === "pull_request" && payload?.action === "synchronize") {
      eventKey = "pull_request.synchronize";
      issueNumber = payload?.pull_request?.number || payload?.number;
    } else if (githubEvent === "issues" && payload?.action === "opened") {
      eventKey = "issues.opened";
      issueNumber = payload?.issue?.number;
    }

    if (!eventKey) {
      res.json({ message: "Event ignored", githubEvent, action: payload?.action });
      return;
    }

    const matchingZaps = await Zap.find({
      repoFullName,
      event: eventKey,
      enabled: true,
    });

    const results: Array<{ zapId: string; status: string; error?: string }> = [];

    for (const zap of matchingZaps) {
      try {
        const owner = await User.findById(zap.userId);
        if (!owner?.accessToken) {
          results.push({ zapId: zap.id, status: "skipped", error: "Missing user access token" });
          continue;
        }

        if (zap.action === "comment_on_pr" && issueNumber) {
          const commentBody = zap.actionConfig?.commentBody || "Thanks for opening this pull request!";
          await postIssueOrPrComment(owner.accessToken, repoFullName, issueNumber, commentBody);

          zap.lastTriggeredAt = new Date();
          zap.triggerCount = (zap.triggerCount || 0) + 1;
          await zap.save();

          results.push({ zapId: zap.id, status: "executed" });
        } else {
          results.push({ zapId: zap.id, status: "skipped", error: "Unsupported action or missing PR number" });
        }
      } catch (execErr) {
        console.error(`[webhook] zap ${zap.id} execution error:`, execErr);
        results.push({
          zapId: zap.id,
          status: "error",
          error: execErr instanceof Error ? execErr.message : "Execution failed",
        });
      }
    }

    res.json({ processed: results.length, results });
  } catch (err) {
    console.error("[webhook] handler error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
