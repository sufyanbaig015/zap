import express from "express";
import { requireAuth } from "../middleware/auth";

const router: express.Router = express.Router();

router.use(requireAuth);

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

// Fetch repositories accessible to the signed-in GitHub user
router.get("/repos", async (req: express.Request, res: express.Response) => {
  const token = req.user?.accessToken;
  if (!token) {
    res.status(400).json({ error: "No GitHub access token found for user" });
    return;
  }

  try {
    const response = (await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "zap-app",
      },
    })) as unknown as FetchResponse;

    if (!response.ok) {
      const text = await response.text();
      console.error("[github] repos fetch failed:", response.status, text);
      res.status(response.status).json({ error: "Failed to fetch GitHub repositories" });
      return;
    }

    const repos = (await response.json()) as GitHubRepoResponse[];
    res.json(
      repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        url: r.html_url,
        defaultBranch: r.default_branch,
      })),
    );
  } catch (err) {
    console.error("[github] repos error:", err);
    res.status(500).json({ error: "Failed to fetch GitHub repositories" });
  }
});

export default router;
