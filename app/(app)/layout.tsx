import { cookies } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { SESSION_COOKIE, isRole } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const role = isRole(roleCookie) ? roleCookie : null;

  return (
    <>
      <NavBar role={role} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
