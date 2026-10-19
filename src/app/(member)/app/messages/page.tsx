import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { listConversationsForViewer } from "@/features/messages/services/conversation.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const viewer = await requireActiveMember();
  const items = await listConversationsForViewer(viewer.id);

  return (
    <section className="space-y-8">
      <Container className="max-w-3xl space-y-8 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Network"
          title="Messages"
          description="Conversations with members you are connected with."
        />
        <ConversationList items={items} />
      </Container>
    </section>
  );
}
