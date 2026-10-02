import { V2_LEVELS } from "../v2-levels.generated";
// Stable onboarding identities: the historical last level remains its own ID,
// but its new lesson is taught at position 12, never at finale difficulty.
const INTRO = ["four-corner-breach", "breath-gap", "slow-command", "relay-sandwich", "corner-cross", "precision-five", "horizon-shift", "focus-orbit", "wheel-echo", "tab-return", "archive-figure-eight", "silent-constellation"];
export const REASONING_SLUGS = [...INTRO, ...V2_LEVELS.map(l=>l.slug).filter(slug=>!INTRO.includes(slug))];
export const REASONING_ORDINAL = new Map(REASONING_SLUGS.map((slug,i)=>[slug,i+1]));
export function isReasoningEnabled(value = process.env.NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN) { return value === "1"; }
