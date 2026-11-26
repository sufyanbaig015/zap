const GITHUB_API = "https://api.github.com";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
}

function githubHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "zap-automation-app",
  };
}

export async function listUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`, {
    headers: githubHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${text}`);
  }

  return (await res.json()) as GitHubRepo[];
}

export async function createRepoWebhook(
  accessToken: string,
  repoFullName: string,
  webhookUrl: string,
  secret?: string,
): Promise<{ id: number }> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/hooks`, {
    method: "POST",
    headers: {
      ...githubHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["pull_request", "issues", "push"],
      config: {
        url: webhookUrl,
        content_type: "json",
        insecure_ssl: "0",
        ...(secret ? { secret } : {}),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub webhook creation failed (${res.status}): ${text}`);
  }

  return (await res.json()) as { id: number };
}

export async function postIssueOrPrComment(
  accessToken: string,
  repoFullName: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: {
      ...githubHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub comment failed (${res.status}): ${text}`);
  }
}
