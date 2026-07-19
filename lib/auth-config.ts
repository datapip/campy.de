// Not real authentication — just a shared password to keep this internal
// tool from being stumbled upon. Change the values below to rotate them.
export const AUTH_PASSWORDS = {
  user: "iAmUser",
  admin: "andAdminAmI",
} as const;
