import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { REPORT_REASONS } from "@/features/reports/services/report.service";
import { ConversationThread } from "@/features/messages/components/conversation-thread";
import { getConversationForViewer } from "@/features/messages/services/conversation.service";
import { loadMessagePage } from "@/features/messages/services/message.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * Access is checked here on the server: the viewer must be a participant, connected, unblocked and active.
 * Anything else renders the same not-found page, so the existence of a thread is not revealed.
 */
export default async function ConversationPage({ params }: ConversationPageProps) {
  const viewer = await requireActiveMember();
  const { conversationId } = await params;

  const context = await getConversationForViewer(viewer.id, conversationId);
  if (!context) {
    notFound();
  }

  const page = await loadMessagePage(viewer.id, conversationId, null);
  if (!page.ok) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <Container className="max-w-3xl space-y-6 px-0">
        <ConversationThread
          conversationId={conversationId}
          viewerId={viewer.id}
          other={context.other}
          initialMessages={page.data.messages}
          initialHasMore={page.data.hasMore}
          reportReasons={REPORT_REASONS}
        />
      </Container>
    </section>
  );
}
