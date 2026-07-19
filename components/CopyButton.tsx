"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Kopieren",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className={cn(copied && "bg-green-600 text-white hover:bg-green-600")}
    >
      {copied ? "Kopiert!" : label}
    </Button>
  );
}
