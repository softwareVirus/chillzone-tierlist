import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let inflight: Promise<void> | null = null;

/**
 * If the database has no users, create the default tenant and main admin from env.
 * Idempotent and safe to call from instrumentation and from credentials login.
 */
export function ensureMainAdmin(): Promise<void> {
  if (inflight) return inflight;
  inflight = runBootstrap().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function runBootstrap(): Promise<void> {
  try {
    const existing = await prisma.user.count();
    if (existing > 0) return;

    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    const tenantName =
      process.env.TENANT_NAME?.trim() || "Chillzone Tierlist";
    let tenantSlug =
      process.env.TENANT_SLUG?.trim().toLowerCase() || "chillzone";

    if (!email || !password) {
      console.error(
        "[chillzone-tierlist] Database has no users. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then restart the server.",
      );
      return;
    }

    if (password.length < 8) {
      console.error(
        "[chillzone-tierlist] ADMIN_PASSWORD must be at least 8 characters.",
      );
      return;
    }

    if (!slugRe.test(tenantSlug)) {
      console.error(
        "[chillzone-tierlist] TENANT_SLUG must be lowercase letters, numbers, and hyphens only.",
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const again = await tx.user.count();
      if (again > 0) return;

      const tenant = await tx.tenant.create({
        data: { name: tenantName, slug: tenantSlug },
      });
      await tx.user.create({
        data: {
          email,
          passwordHash,
          name: "Admin",
          tenantId: tenant.id,
        },
      });
    });

    console.info(
      `[chillzone-tierlist] Created default workspace "${tenantName}" (${tenantSlug}) and admin ${email}.`,
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return;
      if (e.code === "P2021") {
        console.error(
          "[chillzone-tierlist] Database tables are missing. From this project folder run: npx prisma migrate deploy",
        );
        return;
      }
    }
    console.error("[chillzone-tierlist] Bootstrap admin failed:", e);
  }
}
