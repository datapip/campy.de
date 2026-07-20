"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { downloadDataUrl } from "@/lib/download";

export function QrCodeButton({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        type: "image/png",
        width: 500,
        color: { dark: "#000000", light: "#ffffff" },
      });
      downloadDataUrl(filename, dataUrl);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      QR-Code
    </Button>
  );
}
