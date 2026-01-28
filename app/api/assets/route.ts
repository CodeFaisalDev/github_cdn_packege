import { NextRequest, NextResponse } from "next/server";
import { GithubCDN } from "../../../github_cdn_package/src/index";

const cdn = new GithubCDN({
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
});

export async function GET() {
    try {
        const assets = await cdn.list();
        return NextResponse.json({ assets });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
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
