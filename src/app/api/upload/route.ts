import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";
import { readBriefKey } from "@/lib/brief-access";
import { clientIp, hit } from "@/lib/rate-limit";
import { uploadsEnabled } from "@/lib/uploads";

/**
 * Issues a short-lived token so the browser uploads straight to file storage.
 * Only signed-in users, or visitors who are in the middle of building a brief, may upload.
 */
export async function POST(request: Request) {
  if (!uploadsEnabled()) return NextResponse.json({ error: "uploads_disabled" }, { status: 501 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        const key = user ? `u:${user.id}` : (await readBriefKey()) ? `ip:${await clientIp()}` : null;
        if (!key) throw new Error("unauthorized");
        const rl = await hit(`upload:${key}`, user ? 60 : 12, 3600);
        if (!rl.ok) throw new Error("rate_limited");
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024,
          allowedContentTypes: [
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
            "application/pdf", "application/zip", "application/x-zip-compressed",
            "video/mp4", "video/quicktime", "audio/mpeg", "audio/wav", "audio/mp4",
            "text/plain", "text/csv", "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/postscript", "image/vnd.adobe.photoshop", "application/octet-stream",
          ],
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload_failed" }, { status: 400 });
  }
}
