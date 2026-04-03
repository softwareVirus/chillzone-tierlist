import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { toIsoDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { isValidPoolPicture } from "@/lib/image-data-url";
import { TIERS, type Tier } from "@/lib/tierlist";

const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

function isTier(s: string): s is Tier {
  return (TIERS as readonly string[]).includes(s);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const [dbUser, participants, days] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastTierlistDate: true },
    }),
    prisma.participant.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tierlistDay.findMany({
      where: { tenantId },
      include: { placements: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const rankings: Record<string, Partial<Record<string, Tier>>> = {};
  for (const d of days) {
    const map: Partial<Record<string, Tier>> = {};
    for (const p of d.placements) {
      if (isTier(p.tier)) map[p.participantId] = p.tier;
    }
    rankings[d.date] = map;
  }

  const users = participants.map((p) => ({
    id: p.id,
    name: p.name,
    picture: p.picture,
  }));

  const sortedDates = Object.keys(rankings).sort();
  const selectedDate =
    dbUser?.lastTierlistDate ??
    sortedDates[sortedDates.length - 1] ??
    toIsoDate(new Date());

  const tierlistScreenshots: Record<string, string | null> = {};
  for (const d of days) {
    if (d.tierlistScreenshot != null) {
      tierlistScreenshots[d.date] = d.tierlistScreenshot;
    }
  }

  return NextResponse.json({
    users,
    rankings,
    selectedDate,
    tierlistScreenshots,
  });
}

type BodyUser = { id: string; name: string; picture: string };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const users = rec.users;
  const rankings = rec.rankings;
  const selectedDate = rec.selectedDate;

  if (!Array.isArray(users)) {
    return NextResponse.json({ error: "users must be an array" }, { status: 400 });
  }
  if (typeof rankings !== "object" || rankings === null) {
    return NextResponse.json({ error: "rankings must be an object" }, { status: 400 });
  }

  const normalizedUsers: BodyUser[] = [];
  for (const u of users) {
    if (typeof u !== "object" || u === null) {
      return NextResponse.json({ error: "Invalid user entry" }, { status: 400 });
    }
    const o = u as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const picture = typeof o.picture === "string" ? o.picture.trim() : "";
    if (!id || !name || !picture) {
      return NextResponse.json(
        { error: "Each user needs id, name, and picture" },
        { status: 400 },
      );
    }
    if (!isValidPoolPicture(picture)) {
      return NextResponse.json(
        { error: "Invalid picture (use base64 data URL or https image URL)" },
        { status: 400 },
      );
    }
    normalizedUsers.push({ id, name, picture });
  }

  const normalizedRankings: Record<string, Partial<Record<string, Tier>>> = {};
  for (const [date, map] of Object.entries(rankings as Record<string, unknown>)) {
    if (!isoDateRe.test(date)) {
      return NextResponse.json({ error: `Invalid date key: ${date}` }, { status: 400 });
    }
    if (typeof map !== "object" || map === null) {
      return NextResponse.json({ error: `Invalid rankings for ${date}` }, { status: 400 });
    }
    const dayMap: Partial<Record<string, Tier>> = {};
    for (const [pid, tierVal] of Object.entries(map as Record<string, unknown>)) {
      if (typeof tierVal !== "string" || !isTier(tierVal)) {
        return NextResponse.json(
          { error: `Invalid tier for ${date} / ${pid}` },
          { status: 400 },
        );
      }
      dayMap[pid] = tierVal;
    }
    normalizedRankings[date] = dayMap;
  }

  if (
    selectedDate !== undefined &&
    selectedDate !== null &&
    (typeof selectedDate !== "string" || !isoDateRe.test(selectedDate))
  ) {
    return NextResponse.json({ error: "Invalid selectedDate" }, { status: 400 });
  }

  const keepIds = new Set(normalizedUsers.map((u) => u.id));

  try {
    await prisma.$transaction(async (tx) => {
      for (const u of normalizedUsers) {
        const existing = await tx.participant.findUnique({ where: { id: u.id } });
        if (existing && existing.tenantId !== tenantId) {
          throw new Error("cross-tenant");
        }
        await tx.participant.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            tenantId,
            name: u.name,
            picture: u.picture,
          },
          update: { name: u.name, picture: u.picture },
        });
      }

      if (normalizedUsers.length === 0) {
        await tx.participant.deleteMany({ where: { tenantId } });
      } else {
        await tx.participant.deleteMany({
          where: {
            tenantId,
            id: { notIn: [...keepIds] },
          },
        });
      }

      const dateKeys = Object.keys(normalizedRankings);
      if (dateKeys.length === 0) {
        await tx.tierlistDay.deleteMany({ where: { tenantId } });
      } else {
        await tx.tierlistDay.deleteMany({
          where: { tenantId, date: { notIn: dateKeys } },
        });
      }

      for (const [date, map] of Object.entries(normalizedRankings)) {
        const ids = Object.keys(map);
        if (ids.length === 0) {
          const existing = await tx.tierlistDay.findUnique({
            where: { tenantId_date: { tenantId, date } },
          });
          if (existing?.tierlistScreenshot) {
            await tx.placement.deleteMany({
              where: { tierlistDayId: existing.id },
            });
          } else {
            await tx.tierlistDay.deleteMany({ where: { tenantId, date } });
          }
          continue;
        }

        const day = await tx.tierlistDay.upsert({
          where: { tenantId_date: { tenantId, date } },
          create: { tenantId, date },
          update: {},
        });

        await tx.placement.deleteMany({ where: { tierlistDayId: day.id } });

        for (const participantId of Object.keys(map)) {
          const tier = map[participantId];
          if (!tier || !keepIds.has(participantId)) continue;
          await tx.placement.create({
            data: { tierlistDayId: day.id, participantId, tier },
          });
        }
      }

      if (typeof selectedDate === "string") {
        const u = await tx.user.updateMany({
          where: { id: userId, tenantId },
          data: { lastTierlistDate: selectedDate },
        });
        if (u.count === 0) {
          throw new Error("user-not-found");
        }
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "cross-tenant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (e instanceof Error && e.message === "user-not-found") {
      return NextResponse.json(
        { error: "Session no longer matches an account. Sign out and sign in again." },
        { status: 401 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
