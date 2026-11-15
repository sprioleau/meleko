"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function RemoveVerse({ id, reference }: { id: string; reference: string }) {
  const remove = useMutation(api.collection.remove);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function confirmRemoval() {
    setError("");
    setIsPending(true);
    try {
      await remove({ verseId: id.slice("personal:".length) as Id<"personalVerses"> });
    } catch {
      setError("This verse couldn’t be removed. Try again.");
      setIsPending(false);
    }
  }

  if (!isConfirming) {
    return <button type="button" className="button button-soft button-small" aria-label={`Remove ${reference}`} onClick={() => setIsConfirming(true)}>
      <Trash2 size={16} aria-hidden="true" />
    </button>;
  }

  return <div className="verse-remove">
    <p>Remove this verse from your library?</p>
    <button type="button" className="button button-soft button-small" disabled={isPending} onClick={() => setIsConfirming(false)}>Cancel</button>
    <button type="button" className="button button-soft button-small" disabled={isPending} onClick={confirmRemoval}>Remove verse</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
