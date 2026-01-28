# GithubCDN Universal SDK

A production-grade, type-safe TypeScript library for decentralized asset delivery using GitHub infrastructure. Works in all modern JS environments: Node.js, Express, React, Angular, Vue, and Edge.

## 🚀 Key Features
- **Univeral Binary Support**: Works with `File`, `Blob`, and Node.js `Buffer`.
- **Atomic Parallel Upload**: Optimized 5MB chunking with single-commit integrity.
- **Hybrid Multi-Source Racing**: Sub-second retrievals via JSDelivr/GitHub.
- **Physical Purge**: Permanent history scrubbing for deleted assets.
- **High-Res Progress**: Structured callbacks for UI upload tracking.

## 🛠️ Usage Examples

### 1. Initialization
```typescript
import { GithubCDN } from "github-cdn-sdk";

const cdn = new GithubCDN({
  token: "...",
  owner: "...",
  repo: "..."
});
```

### 2. Node.js / Express (Backend)
Stream a file reconstruction directly to an Express response:
```typescript
app.get("/video/:id", async (req, res) => {
  const { stream, manifest } = await cdn.fetch(req.params.id);
  
  res.setHeader("Content-Type", manifest.mimeType);
  res.setHeader("Content-Length", manifest.totalSize);
  
  // ReadableStream to Node Writable
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
});
```

### 3. React / Frontend (UI Tracking)
Easily track upload percentage in your dashboard:
```typescript
const handleUpload = async (file) => {
  const asset = await cdn.upload(file, (log) => {
    if (log.progress) {
      console.log(`${log.progress.percentage}% uploaded...`);
      setUploadProgress(log.progress.percentage);
    }
  });
  console.log("Success:", asset.links.cdn);
};
```

### 4. Direct Asset Links
Get multi-provider URLs for any asset instantly:
```typescript
const assets = await cdn.list();
const first = assets[0];

console.log("JSDelivr CDN:", first.links.cdn);
console.log("Direct GitHub:", first.links.raw);
console.log("Vercel Proxy:", first.links.origin);
```

## 📜 License
MIT
