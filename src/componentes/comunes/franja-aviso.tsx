"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export function FranjaAviso({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-foreground">{children}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
        aria-label="Cerrar aviso"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
