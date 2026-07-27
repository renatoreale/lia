import type { Metadata } from "next";

import { SignupForm } from "@/components/shared/signup-form";

export const metadata: Metadata = {
  title: "Registrati — LIA",
};

export default function SignupPage() {
  return <SignupForm />;
}
