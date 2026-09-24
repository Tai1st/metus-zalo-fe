import { NextResponse, type NextRequest } from "next/server";
import { be, BeHttpError } from "@/server/zalo/be-client";

export const dynamic = "force-dynamic";

const SCALES = ["personal", "small", "medium", "large"];

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: { fullName?: string; phone?: string; scale?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Body không hợp lệ");
  }
  const fullName = body.fullName?.trim() ?? "";
  const phone = (body.phone ?? "").replace(/[\s.-]/g, "");
  const scale = body.scale ?? "";
  if (!fullName || fullName.length > 100) return bad("Vui lòng nhập họ và tên");
  if (!/^(0|\+84)\d{9}$/.test(phone)) return bad("Số điện thoại không hợp lệ");
  if (!SCALES.includes(scale)) return bad("Vui lòng chọn quy mô kinh doanh");

  try {
    await be("", { method: "POST", body: { fullName, phone, scale } }, "/leads");
  } catch (e) {
    const status = e instanceof BeHttpError ? e.status : 502;
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: status >= 500 ? 502 : status },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
