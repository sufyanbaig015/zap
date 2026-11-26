# Zap

A GitHub workflow automation builder with an agentic AI Copilot powered by Google Gemini.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure backend environment variables:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

3. Ensure MongoDB is running locally (or provide a remote `MONGODB_URI`).

## Required Environment Variables (`apps/backend/.env`)

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Backend server port | `4000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/zap` |
| `SESSION_SECRET` | Express session secret | `change-me-in-production` |
| `BACKEND_URL` | Backend base URL | `http://localhost:4000` |
| `CLIENT_ORIGIN` | Frontend origin for CORS | `http://localhost:4200` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | `your_github_client_id` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | `your_github_client_secret` |
| `GEMINI_API_KEY` | Google Gemini API key for Copilot | `your_gemini_api_key` |
| `GEMINI_MODEL` | Gemini model ID (optional) | `gemini-3.8-flash` |

## Running Locally

Start the backend and frontend in separate terminals:

```bash
# Backend (http://localhost:4000)
pnpm --filter backend dev

# Frontend (http://localhost:4200)
pnpm --filter frontend start
```
