"use client";

import { FormFeedback } from "@/components/admin/form-feedback";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/server/actions/owner";

export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const { state, pending, formProps } = useFormAction(markAllNotificationsRead);
  return (
    <form {...formProps} className="grid justify-items-end gap-2">
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || !hasUnread}
        className="min-h-10 px-4"
      >
        {pending ? "Marcando…" : "Marcar todas como lidas"}
      </Button>
      <FormFeedback state={state} />
    </form>
  );
}
