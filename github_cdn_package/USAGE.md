# GithubCDN SDK Complete Technical Reference

This document provides a detailed specification of the GithubCDN SDK's API, parameters, and return types.

---

## ⚙️ Constructor: `new GithubCDN(config)`

Initializes the SDK client with repository credentials.

### Parameters
| Name | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `token` | `string` | GitHub Personal Access Token (Classic or Fine-grained) with `repo` scope. | Yes |
| `owner` | `string` | The GitHub username or organization name. | Yes |
| `repo` | `string` | The repository name dedicated to CDN storage. | Yes |
| `branch` | `string` | The target branch for commits. Defaults to `"main"`. | No |
| `userAgent`| `string` | Custom User-Agent header for API identification. | No |

### Declaration Example
```typescript
import { GithubCDN, CDNConfig } from "github-cdn-sdk";

const config: CDNConfig = {
  token: process.env.GITHUB_TOKEN,
  owner: "faisal-dev",
  repo: "assets-storage",
  branch: "production"
};

const cdn = new GithubCDN(config);
```

---

## 🚀 Main API Methods

### 1. `upload(input, onUpdate?)`
Asynchronously chunks and uploads a binary file to GitHub.

#### Parameters
1.  **`input`**: Can be a Browser `File`, a `Blob`, or a Node.js `Buffer`.
2.  **`onUpdate`**: *(Optional)* A callback function `(log: CDNLog) => void`.

#### Expected Output
Returns a `Promise<CDNAsset>`.
```json
{
  "id": "abc123_1737720000",
  "name": "video.mp4",
  "size": 5242880,
  "type": "video/mp4",
  "path": "uploads/2026_01/abc123_video.mp4",
  "uploadedAt": "2026-01-24T12:00:00Z",
  "links": {
    "cdn": "https://cdn.jsdelivr.net/gh/owner/repo@main/path/manifest.json",
    "raw": "https://raw.githubusercontent.com/owner/repo/main/path/manifest.json",
    "origin": "/api/fetch?file=path"
  }
}
```

---

### 2. `fetch(assetPath)`
Retrieves an asset using multi-source racing logic.

#### Parameters
1.  **`assetPath`**: The relative folder path of the asset (obtained from `CDNAsset.path`).

#### Expected Output
Returns a `Promise<{ stream: ReadableStream, manifest: CDNManifest }>`.

**Manifest Schema**:
```json
{
  "id": "unique_id",
  "totalChunks": 12,
  "chunkSize": 5242880,
  "totalSize": 62914560,
  "mimeType": "video/mp4"
}
```

---

### 3. `delete(id, folderPath)`
Performs a permanent physical purge of an asset.

#### Parameters
1.  **`id`**: The unique identifier of the asset.
2.  **`folderPath`**: The exact relative path where chunks are stored.

#### Expected Output
Returns a `Promise<boolean>` (`true` if successful).

---

### 4. `list()`
Fetches the current global registry.

#### Expected Output
Returns a `Promise<CDNAsset[]>`. (An array of Asset objects defined in Section 1).

---

### 5. `sync()`
Deep scans the repository to rebuild a lost or corrupted registry.

#### Expected Output
Returns a `Promise<{ recovered: number }>`.
```json
{ "recovered": 5 }
```

---

## 📊 The `CDNLog` Object (Progress Tracking)
When using the `onUpdate` callback in `upload`, you receive a `CDNLog` object.

### Parameters within `log.progress`:
| Field | Type | Description |
| :--- | :--- | :--- |
| `percentage` | `number` | Integer (0-100) representing total status. |
| `currentChunk`| `number` | The chunk currently being uploaded. |
| `totalChunks` | `number` | Total chunks the file was split into. |
| `loaded` | `number` | Bytes successfully committed. |
| `total` | `number` | Total file size in bytes. |
| `stage` | `string` | Human-readable status (e.g. "Pushing chunk 1/5"). |

---

## � Example: Advanced Implementation
```typescript
const asset = await cdn.upload(myFile, (log) => {
    switch(log.type) {
        case "progress":
            console.log(`[${log.progress.percentage}%] ${log.progress.stage}`);
            break;
        case "done":
            console.log("Upload Complete:", log.asset.links.cdn);
            break;
        case "error":
            console.error("Critical Failure:", log.message);
            break;
    }
});
```

---

## 🏗️ Full Lifecycle Demo: Node.js / TypeScript

This example shows how to perform an end-to-end operation in a single script: Read a file, upload it with real-time percentage tracking, fetch the reconstructed bitstream via the hybrid racer, and finally perform a permanent history scrub (delete).

```typescript
import { GithubCDN } from "github-cdn-sdk";
import fs from "fs/promises";

async function cdnFullCycle() {
    // 1. Initialize with Credentials
    const cdn = new GithubCDN({
        token: "ghp_your_token",
        owner: "faisal",
        repo: "cdn-storage",
        branch: "main" 
    });

    // 2. Upload with Progress Callback
    const fileBuffer = await fs.readFile("./presentation.mp4");
    
    const asset = await cdn.upload({
        name: "presentation.mp4",
        type: "video/mp4",
        buffer: fileBuffer.buffer as ArrayBuffer
    }, (log) => {
        if (log.type === "progress") {
             // log.progress contains: percentage, currentChunk, totalChunks, stage
             process.stdout.write(`\r[Upload] ${log.progress.percentage}% - ${log.progress.stage}`);
        }
    });

    console.log("\n✅ Asset ID:", asset.id);
    console.log("🔗 CDN Link:", asset.links.cdn);

    // 3. Fetch & Reconstruct Stream
    const { stream, manifest } = await cdn.fetch(asset.path, (log) => {
        console.log(`[Reconstruction] ${log.message}`);
    });

    console.log(`Streaming ${manifest.totalSize} bytes of ${manifest.mimeType}...`);
    
    // Process stream chunks
    const reader = stream.getReader();
    let downloadedBytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        downloadedBytes += value.length;
    }
    console.log(`✅ Success: Reconstructed ${downloadedBytes} bytes.`);

    // 4. Physical Purge (Permanent History Scrub)
    await cdn.delete(asset.id, asset.path, (log) => {
        process.stdout.write(`\r[Purging] ${log.message}`);
    });
    
    console.log("\n✅ Asset permanently scrubbed from GitHub repository.");
}
```

---

## 📜 License
MIT © CodeFaisalDev
