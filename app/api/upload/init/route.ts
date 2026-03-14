import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GithubCDN } from "../../../../github_cdn_package/src/index";

export async function GET() {
    try {
        const cloudflareEnv = (getCloudflareContext().env as unknown as Env);
        
        const token = cloudflareEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        const owner = cloudflareEnv.GITHUB_OWNER || process.env.GITHUB_OWNER;
        const repo = cloudflareEnv.GITHUB_REPO || process.env.GITHUB_REPO;

        if (!token || !owner || !repo) {
            return NextResponse.json({ 
                error: "Missing environment variables", 
                details: {
                    hasToken: !!token,
                    hasOwner: !!owner,
                    hasRepo: !!repo
                }
            }, { status: 500 });
        }

        const cdn = new GithubCDN({
            token,
            owner,
            repo,
        });

        const headSha = await cdn.getRef();
        const uniqueId = Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
        const now = new Date();
        const pathPrefix = `uploads/${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}/${uniqueId}`;

        return NextResponse.json({
            headSha,
            uniqueId,
            pathPrefix,
            timestamp: now.toISOString()
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
