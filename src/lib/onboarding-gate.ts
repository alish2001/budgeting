const ONBOARDING_SKIPPED_KEY = "budget-planner-onboarding-skipped";

export function hasSkippedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SKIPPED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSkippedOnboarding(skipped: boolean): void {
  try {
    if (skipped) {
      localStorage.setItem(ONBOARDING_SKIPPED_KEY, "true");
      return;
    }

    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
  } catch {
    // Ignore localStorage write failures.
  }
}
