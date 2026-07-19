"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Generator", adminOnly: false },
  { href: "/verlauf", label: "Verlauf", adminOnly: false },
  { href: "/admin", label: "Verwaltung", adminOnly: true },
];

export function NavBar({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.adminOnly || role === "admin");

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-3 sm:px-6">
        <span className="text-base font-semibold">Ziel-URL Generator</span>
        <nav className="flex flex-1 gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  );
}
