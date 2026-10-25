import { PlaneIcon } from "@/components/plane-icon";

type FlyingPlane = {
  animation: string;
  top?: string;
  left?: string;
  size: string;
};

// Aviones de la marca cruzando la pantalla en las cuatro direcciones, en
// loop. Fondo decorativo de las pantallas de acceso (sign-in / sign-up):
// violeta, tenue, no interactivo.
const PLANES: FlyingPlane[] = [
  { animation: "motion-safe:animate-[plane-ltr_13s_linear_infinite]", top: "18%", left: "0", size: "size-7" },
  { animation: "motion-safe:animate-[plane-rtl_16s_linear_infinite_2.5s]", top: "62%", left: "0", size: "size-6" },
  { animation: "motion-safe:animate-[plane-ltr_19s_linear_infinite_7s]", top: "84%", left: "0", size: "size-5" },
  { animation: "motion-safe:animate-[plane-ttb_15s_linear_infinite_1s]", top: "0", left: "22%", size: "size-6" },
  { animation: "motion-safe:animate-[plane-btt_17s_linear_infinite_5s]", top: "0", left: "78%", size: "size-7" },
];

export function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {PLANES.map((plane, i) => (
        <PlaneIcon
          key={i}
          className={`absolute text-primary opacity-0 ${plane.size} ${plane.animation}`}
          style={{ top: plane.top, left: plane.left }}
        />
      ))}
    </div>
  );
}
