import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GithubCDN } from "../../../github_cdn_package/src/index";

export async function GET(req: NextRequest) {
  const cloudflareEnv = (getCloudflareContext().env as unknown as Env);
  const token = cloudflareEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const owner = cloudflareEnv.GITHUB_OWNER || process.env.GITHUB_OWNER;
  const repo = cloudflareEnv.GITHUB_REPO || process.env.GITHUB_REPO;

  const cdn = new GithubCDN({
    token: token!,
    owner: owner!,
    repo: repo!,
  });
  const file = req.nextUrl.searchParams.get("file");
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  try {
    // Core multi-source fetch logic from SDK
    // Now returns both the bitstream and the manifest for headers
    const { stream, manifest } = await cdn.fetch(file);

    return new Response(stream, {
      headers: {
        "Content-Type": manifest.mimeType || "application/octet-stream",
        "Content-Length": manifest.totalSize.toString(),
        "Content-Disposition": `inline; filename="${manifest.fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
