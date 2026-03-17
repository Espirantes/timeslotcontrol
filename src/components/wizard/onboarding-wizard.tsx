"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DoorOpen,
  Users,
  Truck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  Bell,
  Loader2,
  UserCircle,
  PackagePlus,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import { createWizardDemoData, cleanupWizardDemoData } from "@/lib/actions/wizard";
import type { WizardDemoIds } from "@/lib/actions/wizard";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = (userId: string) => `tsc_wizard_v1_${userId}`;

// ─── Step definitions ──────────────────────────────────────────────────────────

type StepConfig = {
  icon: React.ReactNode;
  titleKey: string;
  bodyKey: string;
  isWarning?: boolean;
};

const ADMIN_STEPS: StepConfig[] = [
  { icon: <Sparkles className="size-8 text-brand-red" />, titleKey: "admin.s1Title", bodyKey: "admin.s1Body" },
  { icon: <Building2 className="size-8 text-brand-red" />, titleKey: "admin.s2Title", bodyKey: "admin.s2Body" },
  { icon: <DoorOpen className="size-8 text-brand-red" />, titleKey: "admin.s3Title", bodyKey: "admin.s3Body" },
  { icon: <Users className="size-8 text-brand-red" />, titleKey: "admin.s4Title", bodyKey: "admin.s4Body" },
  { icon: <Truck className="size-8 text-brand-red" />, titleKey: "admin.s5Title", bodyKey: "admin.s5Body" },
  { icon: <CheckCircle2 className="size-8 text-green-500" />, titleKey: "admin.s6Title", bodyKey: "admin.s6Body", isWarning: true },
];

const WORKER_STEPS: StepConfig[] = [
  { icon: <Sparkles className="size-8 text-brand-red" />, titleKey: "worker.s1Title", bodyKey: "worker.s1Body" },
  { icon: <CalendarDays className="size-8 text-brand-red" />, titleKey: "worker.s2Title", bodyKey: "worker.s2Body" },
  { icon: <ClipboardList className="size-8 text-brand-red" />, titleKey: "worker.s3Title", bodyKey: "worker.s3Body" },
  { icon: <CheckCircle2 className="size-8 text-green-500" />, titleKey: "worker.s4Title", bodyKey: "worker.s4Body" },
];

const SUPPLIER_STEPS: StepConfig[] = [
  { icon: <Sparkles className="size-8 text-brand-red" />, titleKey: "supplier.s1Title", bodyKey: "supplier.s1Body" },
  { icon: <PackagePlus className="size-8 text-brand-red" />, titleKey: "supplier.s2Title", bodyKey: "supplier.s2Body" },
  { icon: <Bell className="size-8 text-brand-red" />, titleKey: "supplier.s3Title", bodyKey: "supplier.s3Body" },
  { icon: <CheckCircle2 className="size-8 text-green-500" />, titleKey: "supplier.s4Title", bodyKey: "supplier.s4Body" },
];

const CLIENT_STEPS: StepConfig[] = [
  { icon: <Sparkles className="size-8 text-brand-red" />, titleKey: "client.s1Title", bodyKey: "client.s1Body" },
  { icon: <UserCircle className="size-8 text-brand-red" />, titleKey: "client.s2Title", bodyKey: "client.s2Body" },
  { icon: <CheckCircle2 className="size-8 text-green-500" />, titleKey: "client.s3Title", bodyKey: "client.s3Body" },
];

function getSteps(role: UserRole): StepConfig[] {
  switch (role) {
    case "ADMIN": return ADMIN_STEPS;
    case "WAREHOUSE_WORKER": return WORKER_STEPS;
    case "SUPPLIER": return SUPPLIER_STEPS;
    case "CLIENT": return CLIENT_STEPS;
    default: return WORKER_STEPS;
  }
}

// ─── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i === current
              ? "w-5 h-2 bg-brand-red"
              : i < current
              ? "w-2 h-2 bg-brand-red/40"
              : "w-2 h-2 bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Props = {
  userId: string;
  role: UserRole;
  supplierName?: string | null;
};

export function OnboardingWizard({ userId, role, supplierName }: Props) {
  const t = useTranslations("wizard");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [demoIds, setDemoIds] = useState<WizardDemoIds | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const steps = getSteps(role);
  const storageKey = STORAGE_KEY(userId);

  // Open wizard automatically on first visit
  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      setOpen(true);
    }
  }, [storageKey]);

  // Listen for manual re-open from sidebar
  useEffect(() => {
    function handleOpen() {
      setStep(0);
      setDemoIds(null);
      setOpen(true);
    }
    window.addEventListener("open-wizard", handleOpen);
    return () => window.removeEventListener("open-wizard", handleOpen);
  }, []);

  // Create admin demo data on step 1 (first "Dál" press)
  const handleNext = useCallback(async () => {
    if (role === "ADMIN" && step === 0 && !demoIds) {
      setCreatingDemo(true);
      try {
        const ids = await createWizardDemoData();
        setDemoIds(ids);
      } catch {
        // ignore — demo creation failed, continue anyway
      } finally {
        setCreatingDemo(false);
      }
    }
    setStep((s) => s + 1);
  }, [role, step, demoIds]);

  const handleFinish = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  }, [storageKey]);

  const handleCleanupAndFinish = useCallback(async () => {
    if (demoIds) {
      setCleaning(true);
      try {
        await cleanupWizardDemoData(demoIds);
      } catch {
        // ignore cleanup errors
      } finally {
        setCleaning(false);
      }
    }
    handleFinish();
  }, [demoIds, handleFinish]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    if (demoIds) {
      // best-effort cleanup if user skips mid-way through admin wizard
      cleanupWizardDemoData(demoIds).catch(() => {});
    }
    setOpen(false);
  }, [storageKey, demoIds]);

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const isAdminCleanupStep = role === "ADMIN" && isLastStep;

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6">
        {/* Close */}
        <button
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleSkip}
          aria-label="Zavřít"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {currentStep.icon}
          <h2 className="text-center text-lg font-semibold text-foreground">
            {t(currentStep.titleKey)}
          </h2>
        </div>

        {/* Body */}
        <div className="text-center text-sm text-muted-foreground leading-relaxed min-h-[72px]">
          {creatingDemo ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="size-4 animate-spin" />
              {t("creating")}
            </div>
          ) : (
            <p>
              {role === "SUPPLIER" && currentStep.titleKey === "supplier.s1Title" && supplierName
                ? t(currentStep.bodyKey) + ` (${supplierName})`
                : t(currentStep.bodyKey)}
            </p>
          )}

          {isAdminCleanupStep && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-left">
              {t("admin.cleanupWarning")}
            </div>
          )}
        </div>

        {/* Dots */}
        <StepDots total={steps.length} current={step} />

        {/* Footer */}
        <div className="flex items-center gap-2 pt-1">
          {isAdminCleanupStep ? (
            <>
              <Button variant="outline" size="sm" className="mr-auto" onClick={() => setStep((s) => s - 1)}>
                {t("prev")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleFinish}>
                {t("admin.keepData")}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCleanupAndFinish} disabled={cleaning}>
                {cleaning && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                {t("admin.deleteData")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground mr-auto" onClick={handleSkip}>
                {t("skip")}
              </Button>
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  {t("prev")}
                </Button>
              )}
              {isLastStep ? (
                <Button size="sm" onClick={handleFinish}>{t("finish")}</Button>
              ) : (
                <Button size="sm" onClick={handleNext} disabled={creatingDemo}>
                  {creatingDemo && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                  {t("next")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
