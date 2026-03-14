import { NextRequest, NextResponse } from "next/server";
import { GithubCDN } from "../../../../github_cdn_package/src/index";

export const runtime = "edge";

export async function GET() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

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
