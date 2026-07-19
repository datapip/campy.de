"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/kampagnen", label: "Kampagnen" },
  { href: "/admin/sites", label: "Sites" },
  { href: "/admin/medien", label: "Medien" },
  { href: "/admin/klickids", label: "Klick-IDs" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
