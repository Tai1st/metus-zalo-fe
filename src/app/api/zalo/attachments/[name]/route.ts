import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "attachments");

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const safe = path.basename(name); // block traversal
  const ext = path.extname(safe).toLowerCase();
  if (!TYPES[ext]) return new Response("Not found", { status: 404 });

  try {
    const buf = await fs.readFile(path.join(DIR, safe));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
