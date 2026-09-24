import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "attachments");
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i;

/** Save an image/video for a campaign attachment. Returns a data/-relative path. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Không đọc được form");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Thiếu file");
  if (file.size > MAX_BYTES) return fail("File quá lớn (tối đa 25MB)");

  const ext = (file.name.match(ALLOWED)?.[0] ?? "").toLowerCase();
  if (!ext) return fail("Chỉ hỗ trợ ảnh (jpg/png/gif/webp) hoặc video (mp4/mov/webm)");

  await fs.mkdir(DIR, { recursive: true });
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(
    path.join(DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );

  return ok(
    {
      path: `attachments/${name}`,
      name: file.name,
      type: file.type,
    },
    { status: 201 },
  );
}
