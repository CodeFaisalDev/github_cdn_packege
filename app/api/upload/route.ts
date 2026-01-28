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
