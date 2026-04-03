export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runPrismaMigrateDeploy } = await import(
      "@/lib/ensure-database-schema"
    );
    runPrismaMigrateDeploy();
    const { ensureMainAdmin } = await import("@/lib/bootstrap-admin");
    await ensureMainAdmin();
  }
}
