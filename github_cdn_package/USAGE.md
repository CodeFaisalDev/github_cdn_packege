# GithubCDN SDK — Complete Technical Reference

This document provides a full specification of the GithubCDN SDK.

---

## ⚙️ Constructor: `new GithubCDN(config)`

Initializes the SDK client.

### Parameters
| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | Yes | GitHub Personal Access Token with `repo` scope |
| `owner` | `string` | Yes | GitHub username or organization |
| `repo` | `string` | Yes | Repository name for CDN storage |
| `branch` | `string` | No | Target branch (default: `"main"`) |
| `userAgent` | `string` | No | Custom User-Agent header |

### Example

```typescript
const cdn = new GithubCDN({
  token: process.env.GITHUB_TOKEN,
  owner: "faisal-dev",
  repo: "assets-storage"
});
```

---

## 🚀 API Methods

### 1. `upload(input, onUpdate?)`
Chunks and uploads a binary file to GitHub via atomic Git Trees commit.

**Parameters:**
- `input` — `File` | `Blob` | `Buffer` | `{ name: string; type: string; buffer: ArrayBuffer }`
- `onUpdate` — *(optional)* `(log: CDNLog) => void`

**Returns:** `Promise<CDNAsset>`

```typescript
const asset = await cdn.upload(file, (log) => {
  if (log.progress) {
    console.log(`${log.progress.percentage}% — ${log.progress.stage}`);
  }
});
```

---

### 2. `fetch(assetPath, onUpdate?)`
Retrieves an asset as a `ReadableStream` using multi-source racing.

**Fetch Priority:**
1. jsDelivr CDN (public, fast)
2. GitHub Raw (authenticated fallback)

*(Note: When your Next.js app is deployed to Cloudflare via OpenNext, this entire fetch process runs at the edge and is automatically cached by Cloudflare, giving you ~20ms TTFB natively).*

**Parameters:**
- `assetPath` — `string` (from `CDNAsset.path`)
- `onUpdate` — *(optional)* `(log: CDNLog) => void`

**Returns:** `Promise<{ stream: ReadableStream; manifest: CDNManifest }>`

```typescript
const { stream, manifest } = await cdn.fetch(asset.path, (log) => {
  console.log(log.message);
});

// Next.js API Route example
return new Response(stream, {
  headers: {
    "Content-Type": manifest.mimeType,
    "Cache-Control": "public, s-maxage=31536000, immutable"
  }
});
```

---

### 3. `delete(id, folderPath, onUpdate?)`
Performs a permanent physical purge (removes blobs from Git history).

**Returns:** `Promise<boolean>`

```typescript
await cdn.delete(asset.id, asset.path, (log) => {
  console.log(log.message);
});
```

---

### 4. `list()`
Returns all registered assets from the repository's `registry.json`.

**Returns:** `Promise<CDNAsset[]>`

```typescript
const assets = await cdn.list();
assets.forEach(a => console.log(a.name, a.links.cdn));
```

---

### 5. `sync(onUpdate?)`
Scans the repository to rebuild a corrupted or lost registry.

**Returns:** `Promise<{ recovered: number }>`

```typescript
const { recovered } = await cdn.sync();
console.log(`Recovered ${recovered} assets`);
```

---

### 6. `resolveLinks(asset)`
Generates all provider URLs for a given asset path.

**Returns:** `CDNLinks`

```typescript
const links = cdn.resolveLinks({ path: asset.path, id: asset.id });
console.log(links.cdn);     // jsDelivr URL
console.log(links.raw);     // GitHub Raw URL
console.log(links.origin);  // /api/fetch proxy
```

---

## 📊 Type Reference

### `CDNAsset`
```typescript
{
  id: string;           // Unique identifier
  name: string;         // Original filename
  size: number;         // Total bytes
  type: string;         // MIME type
  path: string;         // Repo-relative folder path
  uploadedAt: string;   // ISO timestamp
  links: CDNLinks;      // Multi-provider URLs
}
```

### `CDNLinks`
```typescript
{
  cdn: string;      // JSDelivr primary
  fastly: string;   // Fastly mirror
  raw: string;      // GitHub Raw (auth needed for private)
  origin: string;   // Vercel/Cloudflare proxy (/api/fetch)
}
```

### `CDNManifest`
```typescript
{
  id: string;
  fileName: string;
  totalChunks: number;
  chunkSize: number;
  totalSize: number;
  mimeType: string;
  pathPrefix: string;
  uploadedAt: string;
}
```

### `CDNLog` (Progress Callback)
```typescript
{
  type: "log" | "error" | "done" | "progress";
  message: string;
  logType?: "info" | "success" | "error" | "warning" | "process";
  progress?: CDNProgress;
  asset?: CDNAsset;
}
```

### `CDNProgress`
| Field | Type | Description |
| :--- | :--- | :--- |
| `percentage` | `number` | 0–100 completion |
| `currentChunk` | `number` | Current chunk index |
| `totalChunks` | `number` | Total chunks |
| `loaded` | `number` | Bytes transferred |
| `total` | `number` | Total file size |
| `stage` | `string` | Human-readable status |

---

## 🏗️ Full Lifecycle Demo

```typescript
import { GithubCDN } from "github-cdn-sdk";
import fs from "fs/promises";

async function demo() {
  const cdn = new GithubCDN({
    token: "ghp_your_token",
    owner: "faisal",
    repo: "cdn-storage"
  });

  // 1. Upload with progress
  const buf = await fs.readFile("./video.mp4");
  const asset = await cdn.upload({
    name: "video.mp4",
    type: "video/mp4",
    buffer: buf.buffer as ArrayBuffer
  }, (log) => {
    if (log.progress) process.stdout.write(`\r${log.progress.percentage}%`);
  });

  console.log("\n✅ Uploaded:", asset.links.cdn);

  // 2. Fetch (Auto-selects fastest source)
  const { stream, manifest } = await cdn.fetch(asset.path);
  console.log(`Streaming ${manifest.totalSize} bytes...`);

  // 3. Delete when done
  await cdn.delete(asset.id, asset.path);
  console.log("Asset purged.");
}
```

---

## 📜 License
MIT © CodeFaisalDev
