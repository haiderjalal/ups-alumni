"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/features/profile/actions/profile.actions";

export function NotificationsMarkReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction();
          router.refresh();
        })
      }
    >
      {isPending ? "Marking…" : "Mark all as read"}
    </Button>
  );
}
