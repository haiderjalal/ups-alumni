/**
 * One-time bootstrap of the first super administrator. Run it from the operator's terminal, never from the web.
 *
 *   ADMIN_BOOTSTRAP_EMAIL=you@example.org ADMIN_BOOTSTRAP_PASSWORD='...' npm run admin:bootstrap
 *
 * The script refuses to run when a super administrator already exists, so it cannot be used to escalate roles later.
 * Clear the password from your shell history after use.
 */
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getEnv } from "@/lib/env";

async function main(): Promise<void> {
  getEnv();

  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";

  if (!email.includes("@")) {
    throw new Error("Set ADMIN_BOOTSTRAP_EMAIL to the administrator's email address.");
  }
  if (password.length < 12) {
    throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD to at least 12 characters.");
  }

  const existingAdmin = await db.roleAssignment.findFirst({
    where: { role: "SUPER_ADMIN", revokedAt: null },
    select: { id: true },
  });
  if (existingAdmin) {
    throw new Error("A super administrator already exists. Use the Roles page to grant access.");
  }

  let user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    const created = await auth.api.signUpEmail({
      body: { name: "Platform administrator", email, password },
    });
    user = { id: created.user.id };
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await tx.roleAssignment.create({ data: { userId: user.id, role: "SUPER_ADMIN" } });
    await tx.auditLog.create({
      data: {
        action: "bootstrap.super_admin_created",
        entityType: "user",
        entityId: user.id,
        actorId: null,
        actorRoles: ["SUPER_ADMIN"],
      },
    });
  });

  console.info(`Super administrator ready for ${email}. Sign in at /login, then add other staff from /admin/roles.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
