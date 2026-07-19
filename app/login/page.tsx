import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Anmelden — Ziel-URL Generator",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
