"use client";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { BudgetProvider } from "@/lib/budget-context";

export default function OnboardingPage() {
  return (
    <BudgetProvider>
      <OnboardingFlow />
    </BudgetProvider>
  );
}

