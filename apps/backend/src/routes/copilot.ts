import express from "express";
import { GoogleGenAI, Type, FunctionDeclaration, Content } from "@google/genai";
import { requireAuth } from "../middleware/auth";
import Zap from "../models/Zap";
import ZapRun from "../models/ZapRun";
import User from "../models/User";

const router: express.Router = express.Router();
router.use(requireAuth);

const SYSTEM_INSTRUCTION = `You are Zap Copilot, an expert, fully agentic AI assistant embedded in the Zapier-like workflow builder.
You help users create, edit, inspect, toggle, delete, and troubleshoot Zaps and their execution runs.

Available Apps, Triggers, and Actions in this platform:
- App: "github"
  - Trigger events:
    - "issue_opened": When a new GitHub issue is opened in a repository
    - "issue_comment": When a comment is added to an issue
    - "pull_request_opened": When a pull request is opened
  - Action events:
    - "create_comment": Post a comment on an issue/PR (config: { commentBody: string })
    - "add_label": Add a label to an issue/PR (config: { label: string })
    - "create_issue": Create a new issue (config: { issueTitle: string, issueBody: string })

Guidelines:
- Always use your tools to inspect or modify Zaps and Runs rather than guessing.
- If the user is currently viewing a Zap (provided in context as currentZapId), you can inspect or edit it directly without asking for its ID.
- When creating or updating a Zap, if the user didn't specify a repository, call \`list_github_repos\` first to see available repositories or ask if needed.
- Be concise, helpful, and clearly summarize what actions you took.`;

const copilotTools: FunctionDeclaration[] = [
  {
    name: "list_zaps",
    description: "List all Zaps belonging to the current user.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_zap",
    description: "Get full details of a specific Zap by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap to retrieve." },
      },
      required: ["zapId"],
    },
  },
  {
    name: "create_zap",
    description: "Create a new Zap workflow.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the Zap." },
        enabled: { type: Type.BOOLEAN, description: "Whether the Zap is enabled (default false)." },
        trigger: {
          type: Type.OBJECT,
          properties: {
            app: { type: Type.STRING, description: "Trigger app, e.g. 'github'" },
            event: { type: Type.STRING, description: "Trigger event, e.g. 'issue_opened', 'issue_comment', 'pull_request_opened'" },
            repository: { type: Type.STRING, description: "Repository in 'owner/repo' format" },
          },
          required: ["app", "event", "repository"],
        },
        actions: {
          type: Type.ARRAY,
          description: "List of actions to execute when triggered.",
          items: {
            type: Type.OBJECT,
            properties: {
              app: { type: Type.STRING, description: "Action app, e.g. 'github'" },
              event: { type: Type.STRING, description: "Action event, e.g. 'create_comment', 'add_label', 'create_issue'" },
              repository: { type: Type.STRING, description: "Repository in 'owner/repo' format" },
              config: {
                type: Type.OBJECT,
                properties: {
                  commentBody: { type: Type.STRING },
                  label: { type: Type.STRING },
                  issueTitle: { type: Type.STRING },
                  issueBody: { type: Type.STRING },
                },
              },
            },
            required: ["app", "event", "repository"],
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_zap",
    description: "Update an existing Zap's name, enabled state, trigger, or actions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap to update." },
        name: { type: Type.STRING, description: "Updated name of the Zap." },
        enabled: { type: Type.BOOLEAN, description: "Updated enabled state." },
        trigger: {
          type: Type.OBJECT,
          properties: {
            app: { type: Type.STRING },
            event: { type: Type.STRING },
            repository: { type: Type.STRING },
          },
        },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              app: { type: Type.STRING },
              event: { type: Type.STRING },
              repository: { type: Type.STRING },
              config: {
                type: Type.OBJECT,
                properties: {
                  commentBody: { type: Type.STRING },
                  label: { type: Type.STRING },
                  issueTitle: { type: Type.STRING },
                  issueBody: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
      required: ["zapId"],
    },
  },
  {
    name: "toggle_zap",
    description: "Enable or disable a Zap.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap to toggle." },
        enabled: { type: Type.BOOLEAN, description: "Target enabled state (true for On, false for Off)." },
      },
      required: ["zapId", "enabled"],
    },
  },
  {
    name: "delete_zap",
    description: "Delete a Zap by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap to delete." },
      },
      required: ["zapId"],
    },
  },
  {
    name: "list_zap_runs",
    description: "List recent execution runs for a specific Zap.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap." },
        limit: { type: Type.NUMBER, description: "Max number of runs to return (default 10)." },
      },
      required: ["zapId"],
    },
  },
  {
    name: "get_zap_run",
    description: "Get detailed step-by-step logs, inputs, outputs, and errors for a specific Zap run.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        zapId: { type: Type.STRING, description: "The ID of the Zap." },
        runId: { type: Type.STRING, description: "The ID of the ZapRun." },
      },
      required: ["zapId", "runId"],
    },
  },
  {
    name: "list_github_repos",
    description: "List the authenticated user's GitHub repositories.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

async function executeTool(
  name: string,
  args: Record<string, any>,
  userId: string,
  mutatedZapIds: Set<string>,
  createdZapIds: string[],
): Promise<Record<string, unknown>> {
  switch (name) {
    case "list_zaps": {
      const zaps = await Zap.find({ userId }).sort({ updatedAt: -1 }).lean();
      return { zaps };
    }
    case "get_zap": {
      const zap = await Zap.findOne({ _id: args.zapId, userId }).lean();
      if (!zap) return { error: "Zap not found" };
      return { zap };
    }
    case "create_zap": {
      const zap = await Zap.create({
        userId,
        name: args.name || "Untitled Zap",
        enabled: Boolean(args.enabled),
        trigger: args.trigger || { app: "", event: "", repository: "" },
        actions: Array.isArray(args.actions) && args.actions.length > 0
          ? args.actions
          : [{ app: "", event: "", repository: "", config: {} }],
      });
      const id = String(zap._id);
      mutatedZapIds.add(id);
      createdZapIds.push(id);
      return { zap: zap.toObject() };
    }
    case "update_zap": {
      const update: Record<string, unknown> = {};
      if (args.name !== undefined) update.name = args.name;
      if (args.enabled !== undefined) update.enabled = args.enabled;
      if (args.trigger !== undefined) update.trigger = args.trigger;
      if (args.actions !== undefined) update.actions = args.actions;

      const zap = await Zap.findOneAndUpdate(
        { _id: args.zapId, userId },
        { $set: update },
        { new: true },
      ).lean();
      if (!zap) return { error: "Zap not found" };
      mutatedZapIds.add(String(zap._id));
      return { zap };
    }
    case "toggle_zap": {
      const zap = await Zap.findOneAndUpdate(
        { _id: args.zapId, userId },
        { $set: { enabled: Boolean(args.enabled) } },
        { new: true },
      ).lean();
      if (!zap) return { error: "Zap not found" };
      mutatedZapIds.add(String(zap._id));
      return { zap };
    }
    case "delete_zap": {
      const deleted = await Zap.findOneAndDelete({ _id: args.zapId, userId }).lean();
      if (!deleted) return { error: "Zap not found" };
      mutatedZapIds.add(String(args.zapId));
      return { deleted: true, id: args.zapId };
    }
    case "list_zap_runs": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 25) : 10;
      const runs = await ZapRun.find({ zapId: args.zapId, userId })
        .sort({ startedAt: -1 })
        .limit(limit)
        .lean();
      return { runs };
    }
    case "get_zap_run": {
      const run = await ZapRun.findOne({ _id: args.runId, zapId: args.zapId, userId }).lean();
      if (!run) return { error: "ZapRun not found" };
      return { run };
    }
    case "list_github_repos": {
      const user = await User.findById(userId).lean();
      const token = (user as any)?.githubAccessToken;
      if (!token) {
        return { error: "GitHub account not connected or missing access token." };
      }
      const resp = (await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "zap-copilot",
        },
      })) as unknown as { ok: boolean; status: number; json: () => Promise<unknown> };
      if (!resp.ok) {
        return { error: `GitHub API error: ${resp.status}` };
      }
      const repos = (await resp.json()) as Array<{ full_name: string; private: boolean }>;
      return { repos: repos.map((r) => ({ full_name: r.full_name, private: r.private })) };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

router.post("/chat", async (req: express.Request, res: express.Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }

    const userId = String((req.user as any)._id);
    const { messages, currentZapId } = req.body as {
      messages: Array<{ role: "user" | "model"; text: string }>;
      currentZapId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const contextPrefix = currentZapId
      ? `[Context: The user currently has Zap ID "${currentZapId}" open in the Zap Builder.]\n`
      : `[Context: The user is in the Zap Builder creating a new Zap (not yet saved).]\n`;

    const contents: Content[] = messages.map((m, idx) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: idx === messages.length - 1 && m.role === "user" ? contextPrefix + m.text : m.text }],
    }));

    const mutatedZapIds = new Set<string>();
    const createdZapIds: string[] = [];
    const executedTools: Array<{ name: string; args: Record<string, any> }> = [];

    let finalReply = "";
    const MAX_TURNS = 8;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: copilotTools }],
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        // Append model's function call turn
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent);
        }

        const functionResponseParts = [];
        for (const call of functionCalls) {
          const toolName = call.name || "";
          const toolArgs = (call.args || {}) as Record<string, any>;
          executedTools.push({ name: toolName, args: toolArgs });
          const result = await executeTool(toolName, toolArgs, userId, mutatedZapIds, createdZapIds);
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: result,
            },
          });
        }

        contents.push({
          role: "user",
          parts: functionResponseParts,
        });
      } else {
        finalReply = response.text || "Done.";
        break;
      }
    }

    res.json({
      reply: finalReply || "Completed.",
      toolCalls: executedTools,
      mutatedZapIds: Array.from(mutatedZapIds),
      createdZapId: createdZapIds[0] || undefined,
    });
  } catch (err: any) {
    console.error("[copilot] error:", err);
    res.status(500).json({ error: err?.message || "Copilot request failed" });
  }
});

export default router;
