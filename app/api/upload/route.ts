import { NextRequest, NextResponse } from "next/server";
import { GithubCDN } from "../../../github_cdn_package/src/index";

const cdn = new GithubCDN({
  token: process.env.GITHUB_TOKEN!,
  owner: process.env.GITHUB_OWNER!,
  repo: process.env.GITHUB_REPO!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await cdn.upload(file, (log) => {
            controller.enqueue(encoder.encode(JSON.stringify(log) + "\n"));
          });
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: err.message }) + "\n"));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
