import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getMemberProfileView } from "@/features/directory/services/directory.service";
import { requireActiveMember, getStaffRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Member profile", robots: { index: false, follow: false } };

interface MemberPageProps {
  params: Promise<{ publicId: string }>;
}

export default async function MemberProfilePage({ params }: MemberPageProps) {
  const { publicId } = await params;
  const viewer = await requireActiveMember();
  const roles = await getStaffRoles(viewer.id);
  const isStaff = roles.includes("MEMBERSHIP_ADMIN") || roles.includes("SUPER_ADMIN");

  const member = /^[A-Za-z0-9_-]{10,40}$/.test(publicId)
    ? await getMemberProfileView(viewer.id, publicId, isStaff)
    : null;
  if (!member) {
    notFound();
  }

  return (
    <section className="py-8 md:py-12">
      <Container className="max-w-3xl space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow={member.batchYear ? `Batch ${member.batchYear}` : "Alumni"}
          title={member.name}
          description={member.headline}
        />

        {member.bio ? <p className="whitespace-pre-line text-lg leading-relaxed text-brand-muted">{member.bio}</p> : null}

        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-brand-muted">Location</dt>
            <dd>{[member.city, member.country].filter(Boolean).join(", ") || "Not shared"}</dd>
          </div>
          {member.organization ? (
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Organization</dt>
              <dd>{member.organization}</dd>
            </div>
          ) : null}
          {member.skills.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-brand-muted">Skills</dt>
              <dd>{member.skills.join(", ")}</dd>
            </div>
          ) : null}
          {member.interests.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-brand-muted">Interests</dt>
              <dd>{member.interests.join(", ")}</dd>
            </div>
          ) : null}
          {member.email ? (
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Email</dt>
              <dd className="break-all">
                <a className="underline underline-offset-4" href={`mailto:${member.email}`}>
                  {member.email}
                </a>
              </dd>
            </div>
          ) : null}
          {member.phone ? (
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Phone</dt>
              <dd>{member.phone}</dd>
            </div>
          ) : null}
          {member.linkedinUrl ? (
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-brand-muted">LinkedIn</dt>
              <dd>
                <a className="underline underline-offset-4" href={member.linkedinUrl} rel="noopener noreferrer nofollow" target="_blank">
                  View profile
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

      </Container>
    </section>
  );
}
