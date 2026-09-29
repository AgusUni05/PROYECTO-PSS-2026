import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";

// US-28/US-29: cuenta del usuario logueado (cualquier rol). Sin gate de rol:
// solo exige sesión iniciada. Clerk maneja el catch-all interno (rutas como
// /cuenta/security), por eso vive en [[...cuenta]] igual que sign-in/sign-up.
export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <UserProfile />
    </div>
  );
}
