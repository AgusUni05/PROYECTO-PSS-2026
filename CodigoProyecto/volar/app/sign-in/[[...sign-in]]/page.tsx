import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { PlaneIcon } from "@/components/plane-icon";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6 py-16">
      <Link href="/" className="group/logo flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-foreground">
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-primary text-white transition-transform duration-500 group-hover/logo:-rotate-[14deg]">
          <PlaneIcon className="size-[18px]" />
        </span>
        VolAR
      </Link>

      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#5530E0",
            colorBackground: "#FFFFFF",
            colorDanger: "#B42318",
            borderRadius: "0.75rem",
            fontFamily: "var(--font-sans)",
          },
          elements: {
            rootBox: "mx-auto",
            card: "rounded-2xl border border-border shadow-[0_30px_70px_-30px_rgba(22,19,61,0.3)]",
            headerTitle: "font-extrabold tracking-tight",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary:
              "bg-primary hover:bg-[#4320C7] text-sm normal-case shadow-none transition-colors",
            footerActionLink: "text-primary hover:text-[#4320C7]",
          },
        }}
      />
    </div>
  );
}
