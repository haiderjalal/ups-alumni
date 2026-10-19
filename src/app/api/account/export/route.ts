import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Exports the signed-in member's own data as JSON. It includes the member's own records only, never another
 * member's data, receipt files, or internal staff notes. Responses are never cached.
 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to export your data." }, { status: 401 });
  }

  const [account, profile, applications, orders, notifications, consents] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, createdAt: true } }),
    db.alumniProfile.findUnique({
      where: { userId: user.id },
      include: { skills: { include: { skill: { select: { name: true } } } }, educations: true, contactVisibility: true },
    }),
    db.alumniApplication.findUnique({
      where: { userId: user.id },
      select: { status: true, submittedAt: true, decidedAt: true, decisionReason: true },
    }),
    db.registrationOrder.findMany({
      where: { userId: user.id },
      select: {
        reference: true,
        status: true,
        amountMinor: true,
        currency: true,
        createdAt: true,
        attempts: { select: { status: true, transactionReference: true, paidOn: true, createdAt: true } },
      },
    }),
    db.notification.findMany({ where: { userId: user.id }, select: { title: true, body: true, createdAt: true }, take: 500 }),
    db.consentRecord.findMany({ where: { userId: user.id }, select: { scope: true, grantedAt: true, revokedAt: true } }),
  ]);

  const exported = {
    exportedAt: new Date().toISOString(),
    account,
    profile: profile
      ? {
          phone: profile.phoneE164,
          currentCity: profile.currentCity,
          currentCountry: profile.currentCountry,
          hometown: profile.hometown,
          pronouns: profile.pronouns,
          bio: profile.bio,
          matricYear: profile.matricYear,
          schoolJoinYear: profile.schoolJoinYear,
          schoolLeaveYear: profile.schoolLeaveYear,
          section: profile.section,
          house: profile.house,
          rollNumber: profile.rollNumber,
          schoolMemory: profile.schoolMemory,
          professionalStatuses: profile.professionalStatuses,
          jobTitle: profile.jobTitle,
          organization: profile.organization,
          industry: profile.industry,
          skills: profile.skills.map((link) => link.skill.name),
          education: profile.educations.map((entry) => ({
            institution: entry.institution,
            qualification: entry.qualification,
            fieldOfStudy: entry.fieldOfStudy,
            startYear: entry.startYear,
            endYear: entry.endYear,
          })),
          directoryDiscoverable: profile.directoryDiscoverable,
          contactVisibility: profile.contactVisibility,
        }
      : null,
    application: applications,
    payments: orders,
    notifications,
    consents,
  };

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ups-alumni-my-data.json"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
