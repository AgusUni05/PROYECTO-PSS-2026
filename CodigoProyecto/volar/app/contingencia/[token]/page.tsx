import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { canPassengerAccessBooking } from "@/lib/auth";
import {
  getContingencyByToken,
  getRebookingAlternatives,
} from "@/features/flights/contingency-queries";
import {
  ContingencyNotFound,
  ContingencyResolution,
} from "@/features/flights/components/contingency-resolution";
import { WrongAccountGate } from "./wrong-account-gate";

export const metadata: Metadata = {
  title: "Resolver contingencia — VolAR",
};

/**
 * US-26/US-33: pantalla de resolución de contingencia. El token sigue siendo
 * el secreto de acceso al enlace, pero la acción sobre la reserva exige que
 * el pasajero autenticado sea el titular (compra web) o que su email verificado
 * coincida con el de contacto (compra de mostrador).
 */
export default async function ContingenciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) {
    return redirectToSignIn({
      returnBackUrl: `/contingencia/${encodeURIComponent(token)}`,
    });
  }

  const view = await getContingencyByToken(token);
  if (!view) {
    return <ContingencyNotFound />;
  }

  if (view.status === "PENDING") {
    const booking = await prisma.booking.findUnique({
      where: { id: view.ticket.bookingId },
      select: { buyerId: true, contactEmail: true, channel: true },
    });
    if (!booking) {
      return <ContingencyNotFound />;
    }

    const allowed = await canPassengerAccessBooking(booking);
    if (!allowed) {
      const signInReturnUrl = `/sign-in?redirect_url=${encodeURIComponent(
        `/contingencia/${encodeURIComponent(token)}`,
      )}`;
      return <WrongAccountGate signInReturnUrl={signInReturnUrl} />;
    }
  }

  const alternatives =
    view.status === "PENDING" ? await getRebookingAlternatives(token) : null;

  return (
    <main className="flex-1 px-4 py-6 md:px-8">
      <ContingencyResolution view={view} alternatives={alternatives ?? []} />
    </main>
  );
}
