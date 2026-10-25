// Fondo fotográfico (pista al atardecer) para las pantallas sin su propia
// sección oscura: la foto se ve en el espacio "en blanco" alrededor de las
// tarjetas, atenuada con el mismo color de fondo del sitio para no competir
// con el contenido. Fijo a la ventana, no bloquea clics.
export function PhotoBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-cover"
      style={{
        backgroundImage:
          "linear-gradient(color-mix(in srgb, var(--background) 86%, transparent), color-mix(in srgb, var(--background) 86%, transparent)), url('/backgrounds/volar-tarmac-dusk.jpg')",
        backgroundPosition: "center 30%",
      }}
    />
  );
}
