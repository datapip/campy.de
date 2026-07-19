"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_PASSWORDS } from "@/lib/auth-config";
import { SESSION_COOKIE, type Role } from "@/lib/auth";
import type { ActionResult } from "./types";

export async function login(password: string): Promise<ActionResult<{ role: Role }>> {
  const role: Role | null =
    password === AUTH_PASSWORDS.admin
      ? "admin"
      : password === AUTH_PASSWORDS.user
        ? "user"
        : null;

  if (!role) {
    return { ok: false, error: "Falsches Passwort." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return { ok: true, data: { role } };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
