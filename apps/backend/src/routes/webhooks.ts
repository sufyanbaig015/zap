import express from "express";
import crypto from "crypto";
import Zap, { IZapAction } from "../models/Zap";
import ZapRun, { IZapRunStep } from "../models/ZapRun";
import User from "../models/User";

const router: express.Router = express.Router();

interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

interface TemplateContext {
  prTitle: string;
  prNumber: number | string;
  prAuthor: string;
  repoName: string;
}

function renderTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{\s*pr\.title\s*\}\}/g, ctx.prTitle)
    .replace(/\{\{\s*pr\.number\s*\}\}/g, String(ctx.prNumber))
    .replace(/\{\{\s*pr\.author\s*\}\}/g, ctx.prAuthor)
    .replace(/\{\{\s*repo\.name\s*\}\}/g, ctx.repoName);
}

function mapGitHubEvent(githubEvent: string, payload: Record<string, unknown>): string | null {
  const action = payload.action as string | undefined;
  if (githubEvent === "pull_request") {
    if (action === "opened") return "pull_request.opened";
    const pr = payload.pull_request as { merged?: boolean } | undefined;
    if (action === "closed" && pr?.merged) return "pull_request.merged";
  }
  if (githubEvent === "issues" && action === "opened") {
    return "issues.opened";
  }
  if (githubEvent === "push") {
    return "push";
  }
  return null;
}

async function executeGitHubAction(
  action: IZapAction,
  accessToken: string,
  ctx: TemplateContext,
  fallbackRepo: string,
): Promise<{ input: Record<string, unknown>; output: Record<string, unknown> }> {
  const targetRepo = action.repository || fallbackRepo;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "zap-app",
  };

  if (action.event === "pull_request.comment") {
    const rawBody = action.config?.commentBody?.trim() || "Thanks for opening this pull request!";
    const body = renderTemplate(rawBody, ctx);
    const url = `https://api.github.com/repos/${targetRepo}/issues/${ctx.prNumber}/comments`;

    const res = (await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ body }),
    })) as unknown as FetchResponse;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub comment failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { id?: number; html_url?: string };
    return {
      input: { repository: targetRepo, pullRequestNumber: ctx.prNumber, body },
      output: { commentId: data.id, url: data.html_url },
    };
  }

  if (action.event === "pull_request.label") {
    const label = action.config?.label?.trim();
    if (!label) throw new Error("Label name is not configured");
    const url = `https://api.github.com/repos/${targetRepo}/issues/${ctx.prNumber}/labels`;

    const res = (await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ labels: [label] }),
    })) as unknown as FetchResponse;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub label failed (${res.status}): ${errText}`);
    }

    return {
      input: { repository: targetRepo, pullRequestNumber: ctx.prNumber, label },
      output: { addedLabel: label },
    };
  }

  if (action.event === "issues.create") {
    const title = renderTemplate(action.config?.issueTitle?.trim() || "New automated issue", ctx);
    const body = renderTemplate(action.config?.issueBody?.trim() || "", ctx);
    const url = `https://api.github.com/repos/${targetRepo}/issues`;

    const res = (await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, body }),
    })) as unknown as FetchResponse;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub create issue failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { number?: number; html_url?: string };
    return {
      input: { repository: targetRepo, title, body },
      output: { issueNumber: data.number, url: data.html_url },
    };
  }

  throw new Error(`Unsupported action event: ${action.event}`);
}

router.post("/github", async (req: express.Request, res: express.Response) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    const expected = `sha256=${crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex")}`;
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  }

  const githubEvent = req.headers["x-github-event"] as string | undefined;
  if (!githubEvent) {
    res.status(400).json({ error: "Missing x-github-event header" });
    return;
  }

  if (githubEvent === "ping") {
    res.json({ ok: true, pong: true });
    return;
  }

  const payload = req.body as Record<string, unknown>;
  const mappedEvent = mapGitHubEvent(githubEvent, payload);
  const repository = (payload.repository as { full_name?: string } | undefined)?.full_name;

  if (!mappedEvent || !repository) {
    res.json({ received: true, ignored: true });
    return;
  }

  try {
    const matchingZaps = await Zap.find({
      enabled: true,
      "trigger.app": "github",
      "trigger.event": mappedEvent,
      "trigger.repository": repository,
    });

    const pr = payload.pull_request as { number?: number; title?: string; user?: { login?: string } } | undefined;
    const issue = payload.issue as { number?: number; title?: string; user?: { login?: string } } | undefined;
    const sender = payload.sender as { login?: string } | undefined;

    const ctx: TemplateContext = {
      prTitle: pr?.title || issue?.title || "",
      prNumber: pr?.number || issue?.number || "",
      prAuthor: pr?.user?.login || issue?.user?.login || sender?.login || "",
      repoName: repository,
    };

    for (const zap of matchingZaps) {
      const runStart = new Date();
      const user = await User.findById(zap.userId);
      const actions = zap.actions?.length ? zap.actions : zap.action ? [zap.action] : [];

      const steps: IZapRunStep[] = [
        {
          stepIndex: 0,
          type: "trigger",
          app: "github",
          event: mappedEvent,
          status: "success",
          startedAt: runStart,
          finishedAt: runStart,
          durationMs: 0,
          output: {
            repository,
            event: mappedEvent,
            prNumber: ctx.prNumber || undefined,
            prTitle: ctx.prTitle || undefined,
            author: ctx.prAuthor || undefined,
          },
        },
      ];

      let allSucceeded = true;

      for (let i = 0; i < actions.length; i++) {
        const act = actions[i];
        const stepStart = new Date();
        if (act.app !== "github") {
          steps.push({
            stepIndex: i + 1,
            type: "action",
            app: act.app,
            event: act.event,
            status: "skipped",
            startedAt: stepStart,
            finishedAt: new Date(),
            durationMs: 0,
          });
          continue;
        }

        try {
          if (!user?.accessToken) {
            throw new Error("No GitHub access token available for Zap owner");
          }
          const result = await executeGitHubAction(act, user.accessToken, ctx, repository);
          const stepEnd = new Date();
          steps.push({
            stepIndex: i + 1,
            type: "action",
            app: act.app,
            event: act.event,
            status: "success",
            startedAt: stepStart,
            finishedAt: stepEnd,
            durationMs: stepEnd.getTime() - stepStart.getTime(),
            input: result.input,
            output: result.output,
          });
        } catch (err) {
          allSucceeded = false;
          const stepEnd = new Date();
          steps.push({
            stepIndex: i + 1,
            type: "action",
            app: act.app,
            event: act.event,
            status: "failed",
            startedAt: stepStart,
            finishedAt: stepEnd,
            durationMs: stepEnd.getTime() - stepStart.getTime(),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const runEnd = new Date();
      await ZapRun.create({
        zapId: zap._id,
        userId: zap.userId,
        status: allSucceeded ? "success" : "failed",
        triggerSummary: {
          event: mappedEvent,
          repository,
        },
        steps,
        startedAt: runStart,
        finishedAt: runEnd,
        durationMs: runEnd.getTime() - runStart.getTime(),
      });

      zap.runCount = (zap.runCount || 0) + 1;
      zap.lastRunAt = runEnd;
      await zap.save();
    }

    res.json({ received: true, matchedZaps: matchingZaps.length });
  } catch (err) {
    console.error("[webhook] github processing error:", err);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;
