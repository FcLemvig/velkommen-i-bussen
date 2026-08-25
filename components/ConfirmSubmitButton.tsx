"use client";

import { Trash2 } from "lucide-react";

export function ConfirmSubmitButton({ message }: { message: string }) {
  return (
    <button
      type="submit"
      className="gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 size={16} />
      Annuller tur
    </button>
  );
}
