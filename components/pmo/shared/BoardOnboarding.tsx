"use client";

/**
 * BoardOnboarding.tsx — S-10 Progressive Disclosure Onboarding
 *
 * Sequential tooltip system that guides first-time board users through
 * key features. State is persisted in localStorage per board to ensure
 * the onboarding only shows once.
 *
 * Steps:
 * 1. "Add your first item" → points at title input
 * 2. "Set a status label" → points at status column
 * 3. "Assign a person" → points at person column
 * 4. "Add a column" → points at + button
 * 5. "Duplicate an item" → points at kebab menu
 * 6. "Expand into subitems" → points at chevron
 */

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── STEP DEFINITIONS ─────────────────────────────────────────────────────────

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector to highlight
  position: "bottom" | "top" | "right" | "left";
}

const STEPS: OnboardingStep[] = [
  {
    id: "add-item",
    title: "Add your first item",
    description: "Click on a row's title area or the '+ New Task' button to create your first task in this board.",
    targetSelector: "[data-onboarding='new-task-btn']",
    position: "bottom",
  },
  {
    id: "set-status",
    title: "Set a status label",
    description: "Click on the Status column cell to assign a colored label. This determines your task's workflow stage.",
    targetSelector: "[data-onboarding='status-cell']",
    position: "bottom",
  },
  {
    id: "assign-person",
    title: "Assign a person",
    description: "Click the Person column to assign a team member. They'll see this task in their 'My Work' view.",
    targetSelector: "[data-onboarding='person-cell']",
    position: "bottom",
  },
  {
    id: "add-column",
    title: "Add a column",
    description: "Click the '+' button at the end of the header row to add new column types like Date, Number, Rating, and more.",
    targetSelector: "[data-onboarding='add-column-btn']",
    position: "left",
  },
  {
    id: "item-menu",
    title: "Manage your items",
    description: "Hover over any row and click the '⋯' menu to duplicate, move, or delete items.",
    targetSelector: "[data-onboarding='item-menu']",
    position: "right",
  },
  {
    id: "expand-subitems",
    title: "Expand into subitems",
    description: "Click the chevron arrow on any task to expand and manage subtasks nested under it.",
    targetSelector: "[data-onboarding='expand-chevron']",
    position: "right",
  },
];

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface BoardOnboardingProps {
  boardId: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const BoardOnboarding: React.FC<BoardOnboardingProps> = ({ boardId }) => {
  const storageKey = `pmo_onboarding_${boardId}`;
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  // Check if onboarding was already completed for this board
  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Small delay so board renders first
      const timer = setTimeout(() => setIsDismissed(false), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Position tooltip near target element
  const positionTooltip = useCallback(() => {
    if (isDismissed) return;
    const step = STEPS[currentStep];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      let top = rect.bottom + 12;
      let left = rect.left + rect.width / 2 - 160; // center horizontally (320px tooltip)

      if (step.position === "top") {
        top = rect.top - 180;
      } else if (step.position === "right") {
        top = rect.top;
        left = rect.right + 12;
      } else if (step.position === "left") {
        top = rect.top;
        left = rect.left - 340;
      }

      // Clamp to viewport
      left = Math.max(16, Math.min(left, window.innerWidth - 340));
      top = Math.max(16, Math.min(top, window.innerHeight - 200));

      setTooltipPos({ top, left });

      // Add highlight ring
      el.classList.add("ring-2", "ring-[#6161FF]", "ring-offset-2", "rounded-md", "z-50", "relative");
    } else {
      setTooltipPos(null);
    }

    return () => {
      if (el) {
        el.classList.remove("ring-2", "ring-[#6161FF]", "ring-offset-2", "rounded-md", "z-50", "relative");
      }
    };
  }, [currentStep, isDismissed]);

  useEffect(() => {
    const cleanup = positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      cleanup?.();
    };
  }, [positionTooltip]);

  const handleNext = () => {
    // Clean up previous highlight
    const prevStep = STEPS[currentStep];
    if (prevStep) {
      const prevEl = document.querySelector(prevStep.targetSelector);
      prevEl?.classList.remove("ring-2", "ring-[#6161FF]", "ring-offset-2", "rounded-md", "z-50", "relative");
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    const prevStep = STEPS[currentStep];
    if (prevStep) {
      const prevEl = document.querySelector(prevStep.targetSelector);
      prevEl?.classList.remove("ring-2", "ring-[#6161FF]", "ring-offset-2", "rounded-md", "z-50", "relative");
    }
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleDismiss = () => {
    const step = STEPS[currentStep];
    if (step) {
      const el = document.querySelector(step.targetSelector);
      el?.classList.remove("ring-2", "ring-[#6161FF]", "ring-offset-2", "rounded-md", "z-50", "relative");
    }
    setIsDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  if (isDismissed) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10 z-40 pointer-events-none" />

      {/* Tooltip */}
      {tooltipPos && (
        <div
          className="fixed z-50 w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden motion-preset-slide-up-sm"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {/* Progress Bar */}
          <div className="h-1 bg-slate-100 w-full">
            <div
              className="h-full bg-gradient-to-r from-[#6161FF] to-[#00CA72] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6161FF]" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title="Skip onboarding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-[15px] font-bold text-slate-800 mb-1">{step.title}</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{step.description}</p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-[12px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-1.5">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={cn(
                    "flex items-center gap-1 px-4 py-1.5 text-[12px] font-bold rounded-lg transition-colors shadow-sm",
                    currentStep === STEPS.length - 1
                      ? "text-white bg-[#00CA72] hover:bg-emerald-600"
                      : "text-white bg-[#6161FF] hover:bg-indigo-600"
                  )}
                >
                  {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                  {currentStep < STEPS.length - 1 && <ChevronRight className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
