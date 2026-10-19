import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { BlockedMemberList, ConnectionMemberList, ConnectionRequestList } from "@/features/connections/components/connection-lists";
import { getConnectionsPageData } from "@/features/connections/services/connection-list.service";
import { REPORT_REASONS } from "@/features/reports/services/report.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Connections", robots: { index: false, follow: false } };

export default async function ConnectionsPage() {
  const viewer = await requireActiveMember();
  const data = await getConnectionsPageData(viewer.id);

  return (
    <section className="space-y-8">
      <Container className="max-w-3xl space-y-12 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Network"
          title="Connections"
          description="Respond to requests, manage your connections and review members you have blocked."
        />

        <section aria-labelledby="incoming-heading" className="space-y-4">
          <h2 id="incoming-heading" className="text-xl font-semibold text-brand-ink">
            Incoming requests <span className="text-brand-muted">({data.incoming.length})</span>
          </h2>
          <ConnectionRequestList items={data.incoming} mode="incoming" reasons={REPORT_REASONS} />
        </section>

        <section aria-labelledby="outgoing-heading" className="space-y-4">
          <h2 id="outgoing-heading" className="text-xl font-semibold text-brand-ink">
            Sent requests <span className="text-brand-muted">({data.outgoing.length})</span>
          </h2>
          <ConnectionRequestList items={data.outgoing} mode="outgoing" reasons={REPORT_REASONS} />
        </section>

        <section aria-labelledby="connections-heading" className="space-y-4">
          <h2 id="connections-heading" className="text-xl font-semibold text-brand-ink">
            Your connections <span className="text-brand-muted">({data.connections.length})</span>
          </h2>
          <ConnectionMemberList members={data.connections} reasons={REPORT_REASONS} />
        </section>

        <section aria-labelledby="blocked-heading" className="space-y-4">
          <h2 id="blocked-heading" className="text-xl font-semibold text-brand-ink">
            Blocked members <span className="text-brand-muted">({data.blocked.length})</span>
          </h2>
          <BlockedMemberList members={data.blocked} />
        </section>
      </Container>
    </section>
  );
}
