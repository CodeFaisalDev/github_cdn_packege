import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@opennextjs/cloudflare";
import { GithubCDN } from "../../../github_cdn_package/src/index";

export async function GET() {
    try {
        const cloudflareEnv = (getRequestContext().env as unknown as Env);
        const token = cloudflareEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        const owner = cloudflareEnv.GITHUB_OWNER || process.env.GITHUB_OWNER;
        const repo = cloudflareEnv.GITHUB_REPO || process.env.GITHUB_REPO;

        const cdn = new GithubCDN({
            token: token!,
            owner: owner!,
            repo: repo!,
        });

        const assets = await cdn.list();
        return NextResponse.json({ assets });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const cloudflareEnv = (getRequestContext().env as unknown as Env);
        const token = cloudflareEnv.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        const owner = cloudflareEnv.GITHUB_OWNER || process.env.GITHUB_OWNER;
        const repo = cloudflareEnv.GITHUB_REPO || process.env.GITHUB_REPO;

        const cdn = new GithubCDN({
            token: token!,
            owner: owner!,
            repo: repo!,
        });
        const { id, path } = await req.json();
        if (!id || !path) throw new Error("Missing ID or path");

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await cdn.delete(id, path, (log) => {
                        controller.enqueue(encoder.encode(JSON.stringify(log) + "\n"));
                    });
                    controller.close();
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: message }) + "\n"));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
