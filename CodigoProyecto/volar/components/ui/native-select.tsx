import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <select> nativo con el mismo lenguaje visual que Input/Select de shadcn.
 * Se usa en filtros que viajan por querystring (GET nativo, sin JS de por medio),
 * a diferencia del Select de shadcn (Base UI) usado en formularios controlados.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
