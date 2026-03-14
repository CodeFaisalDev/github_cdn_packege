# GithubCDN — Zero-Cost Hybrid CDN SDK

A production-grade TypeScript SDK for decentralized asset delivery using GitHub as storage, with optional **Cloudflare Edge** acceleration.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Client (Browser / Node.js / Edge)                  │
│         ↓                                           │
│  ┌──────────────────────────┐                       │
│  │ GithubCDN SDK            │ ← You use this        │
│  │ upload() / fetch() / ... │                       │
│  └──────┬───────────────────┘                       │
│         ↓                                           │
│  ┌──────────────┐   ┌──────────────────┐            │
│  │ GitHub Repo  │   │ Cloudflare Worker│ ← Optional │
│  │ (Storage)    │   │ (Edge Cache)     │   FREE     │
│  └──────────────┘   └──────────────────┘            │
└─────────────────────────────────────────────────────┘
```

**Deployment Architecture:**
The entire Next.js application (including the `/api/fetch` routes) is deployed directly to **Cloudflare Workers** using OpenNext.
This means your origin *is* the edge, providing ~20ms global TTFB and 99%+ cache hit ratios without managing a separate worker infrastructure or Vercel deployment.

## 🚀 Quick Start

### 1. Install & Initialize
```typescript
import { GithubCDN } from "github-cdn-sdk";

const cdn = new GithubCDN({
  token: "ghp_your_personal_access_token",
  owner: "your-username",
  repo: "your-cdn-repo",
});
```

### 2. Upload a File
```typescript
const asset = await cdn.upload(file, (log) => {
  if (log.progress) console.log(`${log.progress.percentage}%`);
});
console.log("CDN URL:", asset.links.cdn);
```

### 3. Fetch & Stream
```typescript
const { stream, manifest } = await cdn.fetch(asset.path);
// stream is a standard ReadableStream
```

### 4. Delete (Physical Purge)
```typescript
await cdn.delete(asset.id, asset.path);
```

### 5. List All Assets
```typescript
const assets = await cdn.list();
```

---

## ⚡ Full App Cloudflare Deployment (Zero-Cost)

This package includes a pre-configured OpenNext setup to deploy your **entire Next.js application** to Cloudflare Workers for free. No separate Edge Worker is needed because your APIs will run directly on the edge.

### Step 1 — Cloudflare Account
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free)
2. Note your **Account ID** from the dashboard sidebar

### Step 2 — Create API Token
1. **My Profile → API Tokens → Create Token**
2. Use template: **"Edit Cloudflare Workers"**
3. Select **"All zones from an account"** if prompted for Zone Resources. Keep other defaults.
4. Click **Create Token** & **Copy the token** (shown only once)

### Step 3 — Deploy via Cloudflare Pages
1. Go to **Cloudflare Dashboard → Workers & Pages → Create**
2. Select the **Pages** tab and click **Connect to Git**
3. Select your `github_cdn` repository.
4. Framework preset: **Next.js** (Cloudflare will automatically configure OpenNext for you).
5. Click **Save and Deploy**.

> **Note:** The first deployment might take a few minutes as Cloudflare automatically sets up the OpenNext translation layer to run your app on their edge.

### Step 4 — Add Environment Variables
Once the deployment finishes (or while it's building):
1. Go to your new Pages project → **Settings → Environment variables**
2. Add your GitHub credentials:

| Variable | Value |
|:---|:---|
| `GITHUB_TOKEN` | Your GitHub PAT |
| `GITHUB_OWNER` | Your GitHub username |
| `GITHUB_REPO` | Your repository name |

3. Trigger a **Retry deployment** so the new variables take effect.

> **Important:** With full app deployment, you do **not** need to set `workerBaseUrl` in your `GithubCDN` config. Your existing `/api/fetch` route is already running natively at the edge!

---

## 📊 Performance Comparison

| Metric | Without Cloudflare | With Cloudflare |
|:---|:---|:---|
| **TTFB** | 800ms–1500ms | **15ms–40ms** |
| **Scalability** | 5K req/hr | **Unlimited** (cached) |
| **Cache Hit Ratio** | N/A | **~99%** |
| **Cost** | $0 | **$0** |

---

## 📜 License
MIT
