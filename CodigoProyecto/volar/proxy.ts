import { clerkMiddleware } from "@clerk/nextjs/server";

// La protección real (sesión + rol ADMIN, US-30) vive junto a cada recurso:
// admin/layout.tsx y el principio de cada server action, no acá. Clerk
// desaconseja el auth-gating por middleware con createRouteMatcher porque el
// path-matching puede desalinearse del ruteo real de Next.js.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
