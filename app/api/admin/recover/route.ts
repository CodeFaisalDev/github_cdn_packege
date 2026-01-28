import { NextResponse } from "next/server";
import { GithubCDN } from "../../../../github_cdn_package/src/index";

const cdn = new GithubCDN({
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
});

export async function POST() {
    try {
        // High-level SDK recon method
        const result = await cdn.sync();
        return NextResponse.json({ success: true, recoveredCount: result.recovered });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
