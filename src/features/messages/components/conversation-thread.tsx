"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { MemberIdentity } from "@/features/connections/components/member-identity";
import type { MemberSummary } from "@/features/connections/services/member-summary";
import { actionOk, type ActionResult } from "@/types/action";

import {
  fetchNewerMessagesAction,
  loadOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
} from "../actions/message.actions";
import { MESSAGE_POLL_INTERVAL_MS } from "../domain/message-rules";
import type { MessageView } from "../services/message.service";

import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";

interface ConversationThreadProps {
  conversationId: string;
  viewerId: string;
  other: MemberSummary;
  initialMessages: MessageView[];
  initialHasMore: boolean;
  reportReasons: readonly string[];
}

const NEAR_BOTTOM_PX = 120;
const REFRESH_FAILED_MESSAGE = "We could not refresh the conversation. It will try again shortly.";
const LOAD_OLDER_FAILED_MESSAGE = "Earlier messages could not be loaded. Try again.";

function compareMessages(a: MessageView, b: MessageView): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

/** Combines message lists, drops duplicates by id and keeps the (createdAt, id) order. */
function mergeMessages(...lists: MessageView[][]): MessageView[] {
  const byId = new Map<string, MessageView>();
  for (const list of lists) {
    for (const message of list) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort(compareMessages);
}

function isNearBottom(element: HTMLElement | null): boolean {
  if (!element) {
    return true;
  }
  return element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX;
}

/**
 * Thread view. Shows the newest page, loads earlier pages by cursor, and polls every 15 seconds for messages
 * newer than the last one shown. No WebSocket is used.
 */
export function ConversationThread({
  conversationId,
  viewerId,
  other,
  initialMessages,
  initialHasMore,
  reportReasons,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<MessageView[]>(() => mergeMessages(initialMessages));
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoadingOlder, startLoadingOlder] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MessageView[]>(messages);
  const pollingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((): void => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  // Start at the newest message, then mark the thread read through what the viewer has been shown.
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const newestInitial = initialMessages[initialMessages.length - 1];
  useEffect(() => {
    if (newestInitial) {
      void markConversationReadAction({ conversationId, readThrough: newestInitial.createdAt });
    }
  }, [conversationId, newestInitial]);

  const pollNewer = useCallback(async (): Promise<void> => {
    if (pollingRef.current || document.hidden) {
      return;
    }
    pollingRef.current = true;
    const shouldFollow = isNearBottom(scrollRef.current);
    try {
      const newest = messagesRef.current[messagesRef.current.length - 1];
      const result = await fetchNewerMessagesAction({
        conversationId,
        after: newest ? { createdAt: newest.createdAt, id: newest.id } : null,
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setNotice(null);
      if (result.data.messages.length > 0) {
        setMessages((previous) => mergeMessages(previous, result.data.messages));
        if (shouldFollow) {
          requestAnimationFrame(scrollToBottom);
        }
      }
    } catch {
      setNotice(REFRESH_FAILED_MESSAGE);
    } finally {
      pollingRef.current = false;
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void pollNewer();
    }, MESSAGE_POLL_INTERVAL_MS);
    const onVisible = (): void => {
      if (!document.hidden) {
        void pollNewer();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollNewer]);

  function loadOlder(): void {
    const oldest = messagesRef.current[0];
    const element = scrollRef.current;
    if (!oldest || !element) {
      return;
    }
    const previousHeight = element.scrollHeight;
    startLoadingOlder(async () => {
      try {
        const result = await loadOlderMessagesAction({
          conversationId,
          before: { createdAt: oldest.createdAt, id: oldest.id },
        });
        if (!result.ok) {
          setNotice(result.message);
          return;
        }
        setHasMore(result.data.hasMore);
        setMessages((previous) => mergeMessages(result.data.messages, previous));
        // Keep the reader's place: the content above grew by exactly the height added.
        requestAnimationFrame(() => {
          element.scrollTop += element.scrollHeight - previousHeight;
        });
      } catch {
        setNotice(LOAD_OLDER_FAILED_MESSAGE);
      }
    });
  }

  async function sendBody(body: string): Promise<ActionResult> {
    const result = await sendMessageAction({ conversationId, body });
    if (!result.ok) {
      return result;
    }
    setMessages((previous) => mergeMessages(previous, [result.data.message]));
    requestAnimationFrame(scrollToBottom);
    return actionOk();
  }

  return (
    <section aria-label="Conversation" className="space-y-6">
      <header className="space-y-3 border-b border-brand-border pb-5">
        <Link href={ROUTES.appMessages} className="text-sm font-semibold text-brand-deep underline underline-offset-4">
          All messages
        </Link>
        <MemberIdentity member={other} nameAs="h1" />
      </header>

      <FormAlert tone="error" message={notice} />

      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-48 space-y-4 overflow-y-auto rounded-2xl border border-brand-border bg-brand-surface p-4"
      >
        {hasMore ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="lg" disabled={isLoadingOlder} onClick={loadOlder}>
              {isLoadingOlder ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Introduce yourself to start the conversation." />
        ) : (
          <ol role="log" aria-live="polite" aria-label={`Messages with ${other.name}`} className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === viewerId}
                reportReasons={reportReasons}
              />
            ))}
          </ol>
        )}
      </div>

      <MessageComposer onSend={sendBody} />
    </section>
  );
}
