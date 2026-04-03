import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import {
  isValidImageDataUrl,
  MAX_IMAGE_DATA_URL_LENGTH,
} from "@/lib/image-data-url";
import { prisma } from "@/lib/prisma";

const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const date = (body as { date?: unknown }).date;
  if (typeof date !== "string" || !isoDateRe.test(date)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const dataUrl = (body as { dataUrl?: unknown }).dataUrl;

  if (dataUrl === null) {
    await prisma.tierlistDay.updateMany({
      where: { tenantId, date },
      data: { tierlistScreenshot: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "dataUrl must be string or null" }, { status: 400 });
  }

  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return NextResponse.json(
      { error: "Image is too large (max ~4MB)." },
      { status: 400 },
    );
  }

  if (!isValidImageDataUrl(dataUrl)) {
    return NextResponse.json(
      { error: "Invalid image data URL." },
      { status: 400 },
    );
  }

  await prisma.tierlistDay.upsert({
    where: { tenantId_date: { tenantId, date } },
    create: { tenantId, date, tierlistScreenshot: dataUrl },
    update: { tierlistScreenshot: dataUrl },
  });

  return NextResponse.json({ ok: true });
}
