// Fondo decorativo minimalista para las pantallas de acceso (sign-in /
// sign-up): una ruta de vuelo punteada con el avión de la marca, en los
// mismos violetas que usa el resto del sitio. Puramente decorativo: fijo,
// sin interacción, muy tenue para no competir con la tarjeta de Clerk.
export function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Anillos, esquina superior derecha */}
        <g stroke="#5530E0" strokeWidth="1" opacity="0.07">
          <circle cx="1480" cy="140" r="80" />
          <circle cx="1480" cy="140" r="160" />
          <circle cx="1480" cy="140" r="250" />
        </g>

        {/* Ruta de vuelo punteada */}
        <path
          d="M 80 760 C 460 820, 760 420, 1040 400 S 1420 160, 1520 140"
          stroke="#5530E0"
          strokeWidth="2"
          strokeDasharray="1.5 16"
          strokeLinecap="round"
          opacity="0.16"
        />

        {/* Origen y destino */}
        <circle cx="80" cy="760" r="5" fill="#5530E0" opacity="0.35" />
        <circle cx="1520" cy="140" r="5" fill="#A996FF" opacity="0.55" />

        {/* Avión sobre la ruta */}
        <g transform="translate(900,392) rotate(-18) scale(4.5)" opacity="0.16">
          <path
            d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
            fill="#5530E0"
          />
        </g>
      </svg>
    </div>
  );
}
