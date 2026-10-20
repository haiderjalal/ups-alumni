import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

import type { MessageView } from "../services/message.service";

import { ReportMessageButton } from "./report-message-button";

const TIME_FORMAT = new Intl.DateTimeFormat("en-PK", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: SITE.defaultTimeZone,
});

interface MessageBubbleProps {
  message: MessageView;
  isOwn: boolean;
  reportReasons: readonly string[];
}

/** Message text is rendered as plain text only. Reporting is offered on messages the viewer received. */
export function MessageBubble({ message, isOwn, reportReasons }: MessageBubbleProps) {
  return (
    <li className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-1.5 rounded-2xl px-4 py-2.5 sm:max-w-[70%]",
          isOwn ? "rounded-br-sm bg-brand-deep text-white" : "rounded-bl-sm bg-brand-lilac text-brand-ink",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
        <div className={cn("flex flex-wrap items-center justify-between gap-x-3 text-xs", isOwn ? "text-white/80" : "text-brand-muted")}>
          <time dateTime={message.createdAt}>{TIME_FORMAT.format(new Date(message.createdAt))}</time>
          {isOwn ? null : <ReportMessageButton messageId={message.id} reasons={reportReasons} />}
        </div>
      </div>
    </li>
  );
}
