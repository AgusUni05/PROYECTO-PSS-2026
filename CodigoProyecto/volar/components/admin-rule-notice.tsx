import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function AdminRuleNotice({
  children,
  title = "Regla integrada",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl bg-secondary p-4 text-[#2E1A8F]">
      <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-card text-primary">
        <Info className="size-[18px]" />
      </span>
      <div>
        <b className="block text-[13.5px]">{title}</b>
        <p className="m-0 text-[13.5px] leading-[1.55] text-[#3D3470]">{children}</p>
      </div>
    </div>
  );
}
