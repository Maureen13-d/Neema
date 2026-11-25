const KEY = 'neema.onboarding.v1';

export interface OnboardingFlags {
  orientationDone: boolean;
  consentDone: boolean;
}

export function loadOnboarding(): OnboardingFlags {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { orientationDone: false, consentDone: false };
    return JSON.parse(raw) as OnboardingFlags;
  } catch {
    return { orientationDone: false, consentDone: false };
  }
}

export function saveOnboarding(flags: OnboardingFlags): void {
  localStorage.setItem(KEY, JSON.stringify(flags));
}
