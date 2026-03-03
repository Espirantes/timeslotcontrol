"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function HeaderLogo() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" || isMobile;

  if (!collapsed) return null;

  return <img src="/logo-mailstep-dark.svg" alt="Mailstep" className="h-5" />;
}

const LOCALES = [
  { code: "cs", flag: "/flags/cz.svg", label: "Čeština" },
  { code: "en", flag: "/flags/gb.svg", label: "English" },
  { code: "it", flag: "/flags/it.svg", label: "Italiano" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#2d3e50] hover:text-[#0c1925] px-2">
          <img src={LOCALES.find((l) => l.code === locale)?.flag} alt="" className="h-4 w-6 rounded-sm object-cover" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className="gap-2"
          >
            <img src={l.flag} alt="" className="h-4 w-6 rounded-sm object-cover" />
            {l.label}
            {locale === l.code && <Check className="size-3.5 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
