"use client";

import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
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

  return <Image src="/logo-mailstep-dark.svg" alt="Mailstep" width={100} height={20} className="h-5 w-auto" />;
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
        <Button variant="ghost" size="sm" className="text-foreground hover:text-brand-navy px-2">
          <Image src={LOCALES.find((l) => l.code === locale)?.flag ?? ""} alt="" width={24} height={16} className="h-4 w-6 rounded-sm object-cover" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className="gap-2"
          >
            <Image src={l.flag} alt="" width={24} height={16} className="h-4 w-6 rounded-sm object-cover" />
            {l.label}
            {locale === l.code && <Check className="size-3.5 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
