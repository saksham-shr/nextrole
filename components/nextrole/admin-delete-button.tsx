"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteUser } from "@/app/actions/admin";
import { useToast } from "@/components/nextrole/toast";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)] opacity-70 transition hover:opacity-100 disabled:opacity-30"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function AdminDeleteButton({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const confirmed = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    if (confirmed.current) { confirmed.current = false; return; }
    e.preventDefault();
    const yes = await toast.confirm(
      `Permanently delete "${userEmail}"?\n\nThis removes their auth account and all associated data. This cannot be undone.`,
    );
    if (yes) { confirmed.current = true; formRef.current?.requestSubmit(); }
  }

  return (
    <form ref={formRef} action={deleteUser} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <DeleteSubmitButton />
    </form>
  );
}
