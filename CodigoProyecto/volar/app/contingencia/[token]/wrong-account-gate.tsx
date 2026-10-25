"use client";

import { SignOutButton } from "@clerk/nextjs";

type WrongAccountGateProps = {
  signInReturnUrl: string;
};

export function WrongAccountGate({ signInReturnUrl }: WrongAccountGateProps) {
  return (
    <main className="flex-1 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          Iniciaste sesión con otra cuenta
        </h1>
        <p className="mt-3 text-muted-foreground">
          Para gestionar este pasaje, necesitás usar la cuenta de VolAR asociada a la reserva.
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl={signInReturnUrl}>
            <button
              type="button"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#4320C7]"
            >
              Cambiar de cuenta
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
