import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GithubCDN } from "../../../../github_cdn_package/src/index";

export async function POST() {
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
        // High-level SDK recon method
        const result = await cdn.sync();
        return NextResponse.json({ success: true, recoveredCount: result.recovered });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
