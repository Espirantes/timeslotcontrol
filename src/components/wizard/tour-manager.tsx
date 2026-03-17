"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/generated/prisma/client";
import { buildTourSteps } from "@/lib/tour/steps";
import "driver.js/dist/driver.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TourState = { step: number; active: boolean };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TOUR_KEY = (userId: string) => `tsc_tour_v2_${userId}`;

function readState(key: string): TourState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TourState;
  } catch {
    return null;
  }
}

function saveState(key: string, state: TourState) {
  localStorage.setItem(key, JSON.stringify(state));
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = { userId: string; role: UserRole };

export function TourManager({ userId, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("tour");
  const storageKey = TOUR_KEY(userId);

  // Keep a ref so we can destroy the driver on unmount
  const driverRef = useRef<{ destroy: () => void } | null>(null);

  function initTour(fromStep: number) {
    // Import driver lazily to avoid SSR issues
    import("driver.js").then(({ driver }) => {
      const steps = buildTourSteps(role, t);
      if (fromStep >= steps.length) return;

      const currentStep = steps[fromStep];

      // If this step requires a different page, navigate there
      if (currentStep.page && !pathname.includes(currentStep.page)) {
        saveState(storageKey, { step: fromStep, active: true });
        router.push(currentStep.page as Parameters<typeof router.push>[0]);
        return;
      }

      // Find the block of consecutive steps for the current page
      // starting from fromStep
      let blockEnd = fromStep;
      while (
        blockEnd + 1 < steps.length &&
        (steps[blockEnd + 1].page === null ||
          (currentStep.page && steps[blockEnd + 1].page === currentStep.page) ||
          (!currentStep.page && steps[blockEnd + 1].page === null))
      ) {
        // Only continue the block if the next step belongs to the same page (or is page-agnostic)
        if (
          steps[blockEnd + 1].page !== null &&
          currentStep.page !== null &&
          steps[blockEnd + 1].page !== currentStep.page
        )
          break;
        if (steps[blockEnd + 1].page !== null && currentStep.page === null) break;
        blockEnd++;
      }

      const localSteps = steps.slice(fromStep, blockEnd + 1);
      const globalOffset = fromStep;
      // If this is NOT the last global step, show "Dál" on the done button
      // (happens when a single-step block like welcome is shown)
      const isLastGlobalStep = blockEnd + 1 >= steps.length;

      const driverObj = driver({
        showProgress: localSteps.length > 1,
        progressText: `{{current}} / {{total}}`,
        showButtons: ["next", "previous", "close"],
        nextBtnText: t("next"),
        prevBtnText: t("prev"),
        doneBtnText: isLastGlobalStep ? t("finish") : t("next"),
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 6,
        stageRadius: 8,
        popoverClass: "tsc-tour-popover",
        steps: localSteps.map((s) => ({
          element: s.element,
          popover: {
            title: s.popover.title,
            description: s.popover.description,
            side: s.popover.side as "top" | "bottom" | "left" | "right" | "over" | undefined,
            align: s.popover.align as "start" | "center" | "end" | undefined,
          },
        })),
        onNextClick: () => {
          const localIdx = driverObj.getActiveIndex() ?? 0;
          const nextGlobal = globalOffset + localIdx + 1;

          if (nextGlobal >= steps.length) {
            saveState(storageKey, { step: 0, active: false });
            driverObj.destroy();
            return;
          }

          saveState(storageKey, { step: nextGlobal, active: true });
          const nextStep = steps[nextGlobal];

          if (nextStep.page && !pathname.includes(nextStep.page)) {
            driverObj.destroy();
            router.push(nextStep.page as Parameters<typeof router.push>[0]);
          } else {
            driverObj.moveNext();
          }
        },
        onPrevClick: () => {
          const localIdx = driverObj.getActiveIndex() ?? 0;
          const prevGlobal = globalOffset + localIdx - 1;

          if (prevGlobal < 0) {
            driverObj.destroy();
            return;
          }

          saveState(storageKey, { step: prevGlobal, active: true });
          const prevStep = steps[prevGlobal];

          if (prevStep.page && !pathname.includes(prevStep.page)) {
            driverObj.destroy();
            router.push(prevStep.page as Parameters<typeof router.push>[0]);
          } else {
            driverObj.movePrevious();
          }
        },
        onCloseClick: () => {
          saveState(storageKey, { step: 0, active: false });
          driverObj.destroy();
        },
        onDestroyStarted: () => {
          // Called when user clicks backdrop; treat as skip
          const state = readState(storageKey);
          if (state?.active) {
            saveState(storageKey, { step: 0, active: false });
          }
          driverObj.destroy();
        },
      });

      driverObj.drive(0);
      driverRef.current = driverObj;
    });
  }

  // ─── Auto-start on first visit ─────────────────────────────────────────────

  useEffect(() => {
    const state = readState(storageKey);

    if (!state) {
      // First visit — start tour
      saveState(storageKey, { step: 0, active: true });
      initTour(0);
    } else if (state.active) {
      initTour(state.step);
    }

    return () => {
      driverRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ─── Manual re-open from sidebar ───────────────────────────────────────────

  useEffect(() => {
    function handleOpen() {
      driverRef.current?.destroy();
      saveState(storageKey, { step: 0, active: true });
      initTour(0);
    }
    window.addEventListener("open-wizard", handleOpen);
    return () => window.removeEventListener("open-wizard", handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
