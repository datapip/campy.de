export type Role = "user" | "admin";

export const SESSION_COOKIE = "zug_session";

export function isRole(value: string | undefined | null): value is Role {
  return value === "user" || value === "admin";
}
