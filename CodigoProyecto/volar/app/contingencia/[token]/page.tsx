import type { Metadata } from "next";
import { getContingencyByToken } from "@/features/flights/contingency-queries";
import {
  ContingencyNotFound,
  ContingencyResolution,
} from "@/features/flights/components/contingency-resolution";

export const metadata: Metadata = {
  title: "Resolver contingencia — VolAR",
};

// US-26: pantalla pública de resolución de contingencia. El token es el único
// secreto de acceso; no se exige sesión de Clerk para que funcione el enlace del email.
export default async function ContingenciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getContingencyByToken(token);

  if (!view) {
    return <ContingencyNotFound />;
  }

  return (
    <main className="flex-1 px-4 py-6 md:px-8">
      <ContingencyResolution view={view} />
    </main>
  );
}
