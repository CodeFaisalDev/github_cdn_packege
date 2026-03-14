import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GithubCDN } from "../../../github_cdn_package/src/index";

export async function POST(req: NextRequest) {
  try {
    const cloudflareEnv = (getCloudflareContext().env as unknown as Env);
    const token = cloudflareEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    const owner = cloudflareEnv.GITHUB_OWNER || process.env.GITHUB_OWNER;
    const repo = cloudflareEnv.GITHUB_REPO || process.env.GITHUB_REPO;

    const cdn = new GithubCDN({
      token: token!,
      owner: owner!,
      repo: repo!,
    });
    const formData = await req.formData();
    const chunk = formData.get("chunk") as Blob;

    if (!chunk) {
      return NextResponse.json({ error: "No chunk uploaded" }, { status: 400 });
    }

    const buffer = await chunk.arrayBuffer();
    const sha = await cdn.createBlob(buffer);

    return NextResponse.json({ sha });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
