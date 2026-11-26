interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

interface GitHubHook {
  id: number;
  config?: {
    url?: string;
  };
}

/**
 * Ensures a GitHub repository has a webhook pointing to this backend's
 * `/api/webhooks/github` endpoint. Best-effort: logs errors without throwing
 * so Zap save/toggle never fails if the user lacks hook admin permissions.
 */
export async function ensureGitHubWebhook(accessToken: string | undefined, repository: string): Promise<void> {
  if (!accessToken || !repository) return;

  const backendUrl = process.env.BACKEND_URL || "";
  if (!backendUrl || backendUrl.includes("localhost") || backendUrl.includes("127.0.0.1")) {
    return;
  }

  const webhookUrl = `${backendUrl.replace(/\/$/, "")}/api/webhooks/github`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "zap-app",
  };

  try {
    const listRes = (await fetch(`https://api.github.com/repos/${repository}/hooks`, {
      headers,
    })) as unknown as FetchResponse;

    if (listRes.ok) {
      const hooks = (await listRes.json()) as GitHubHook[];
      const exists = hooks.some((h) => h.config?.url === webhookUrl);
      if (exists) return;
    }

    const createRes = (await fetch(`https://api.github.com/repos/${repository}/hooks`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["pull_request", "issues", "push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          ...(process.env.GITHUB_WEBHOOK_SECRET ? { secret: process.env.GITHUB_WEBHOOK_SECRET } : {}),
        },
      }),
    })) as unknown as FetchResponse;

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.warn(`[webhook] could not auto-register hook on ${repository}:`, createRes.status, errText);
    } else {
      console.log(`[webhook] registered GitHub hook on ${repository} -> ${webhookUrl}`);
    }
  } catch (err) {
    console.warn(`[webhook] error ensuring hook on ${repository}:`, err);
  }
}
