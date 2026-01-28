import { NextRequest, NextResponse } from "next/server";
import { GithubCDN } from "../../../../github_cdn_package/src/index";

const cdn = new GithubCDN({
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
});

export async function POST(req: NextRequest) {
    try {
        const {
            headSha,
            chunks,
            manifest,
            pathPrefix
        } = await req.json();

        if (!headSha || !chunks || !manifest || !pathPrefix) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create Manifest Blob
        const manifestSha = await cdn.createBlob(Buffer.from(JSON.stringify(manifest)));

        // 2. Prepare Tree Items
        const treeItems = chunks.map((sha: string, index: number) => ({
            path: `${pathPrefix}/chunk_${index + 1}`,
            mode: "100644",
            type: "blob",
            sha
        }));

        // Add manifest to tree
        treeItems.push({
            path: `${pathPrefix}/manifest.json`,
            mode: "100644",
            type: "blob",
            sha: manifestSha
        });

        // 3. Update Registry
        const registry = await cdn.list();
        const newAsset = {
            id: manifest.id,
            name: manifest.fileName,
            size: manifest.totalSize,
            type: manifest.mimeType,
            path: pathPrefix,
            uploadedAt: manifest.uploadedAt,
            links: cdn.resolveLinks({ path: pathPrefix, id: manifest.id })
        };
        registry.unshift(newAsset);

        const registrySha = await cdn.createBlob(Buffer.from(JSON.stringify(registry, null, 2)));
        treeItems.push({
            path: `registry.json`,
            mode: "100644",
            type: "blob",
            sha: registrySha
        });

        // 4. Create Tree
        const treeSha = await cdn.createTree(headSha, treeItems);

        // 5. Create Commit
        const commitSha = await cdn.createCommit(
            `CDN Upload: ${manifest.fileName}`,
            treeSha,
            [headSha]
        );

        // 6. Update Ref
        await cdn.updateRef(commitSha);

        return NextResponse.json({ success: true, asset: newAsset });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
