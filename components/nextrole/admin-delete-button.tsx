"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteUser } from "@/app/actions/admin";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--bad)] opacity-70 transition hover:opacity-100 disabled:opacity-30"
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

  function handleSubmit(e: React.FormEvent) {
    if (
      !window.confirm(
        `Permanently delete "${userEmail}"?\n\nThis removes their auth account and all associated data. This cannot be undone.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={deleteUser} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <DeleteSubmitButton />
    </form>
  );
}
