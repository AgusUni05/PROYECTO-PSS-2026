type Props = {
  /** Archivo en /public/backgrounds. */
  src?: string;
  /** background-position: cada pantalla revela una porción distinta de la foto
   * (según qué tan alta sea su propia sección opaca por encima), así que la
   * posición se ajusta por caso de uso en vez de ser una sola constante. */
  position?: string;
};

// Fondo fotográfico (pista al atardecer) para las pantallas sin su propia
// sección oscura: la foto se ve en el espacio "en blanco" alrededor de las
// tarjetas, atenuada con el mismo color de fondo del sitio para no competir
// con el contenido. Fijo a la ventana, no bloquea clics.
export function PhotoBackdrop({
  src = "/backgrounds/volar-tarmac-dusk.jpg",
  position = "center 30%",
}: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 -z-10 h-screen w-screen bg-cover"
      style={{
        backgroundImage: `linear-gradient(color-mix(in srgb, var(--background) 86%, transparent), color-mix(in srgb, var(--background) 86%, transparent)), url('${src}')`,
        backgroundPosition: position,
      }}
    />
  );
}
