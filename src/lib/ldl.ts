// LDL-C estimation (mg/dL inputs). Methods and applicability limits are explicit.
export type LdlResult = { method: string; value: number | null; valid: boolean; reason: string };

export function nonHdl(tc: number | null, hdl: number | null): number | null {
  return tc === null || hdl === null ? null : tc - hdl;
}
export function remnantC(tc: number | null, ldl: number | null, hdl: number | null): number | null {
  return tc === null || ldl === null || hdl === null ? null : tc - ldl - hdl; // textbook p.388
}
// Friedewald: LDL = TC - HDL - TG/5. Not valid when TG >= 400 mg/dL.
export function friedewald(tc: number | null, hdl: number | null, tg: number | null): LdlResult {
  const m = 'Friedewald';
  if (tc === null || hdl === null || tg === null) return { method: m, value: null, valid: false, reason: 'TC, HDL-C and TG all required' };
  const v = tc - hdl - tg / 5;
  if (tg >= 400) return { method: m, value: v, valid: false, reason: 'TG >= 400 mg/dL: outside validated range; use direct LDL-C' };
  return { method: m, value: v, valid: true, reason: 'TG < 400 mg/dL. Less accurate at low LDL-C (<70 mg/dL) and non-fasting/high TG.' };
}
// Sampson (NIH) equation 2 (Sampson 2020): validated for TG up to 800 mg/dL.
export function sampson(tc: number | null, hdl: number | null, tg: number | null): LdlResult {
  const m = 'Sampson (NIH)';
  if (tc === null || hdl === null || tg === null) return { method: m, value: null, valid: false, reason: 'TC, HDL-C and TG all required' };
  const nh = tc - hdl;
  const v = tc / 0.948 - hdl / 0.971 - (tg / 8.56 + (tg * nh) / 2140 - (tg * tg) / 16100) - 9.44;
  if (tg > 800) return { method: m, value: v, valid: false, reason: 'TG > 800 mg/dL: outside validated range; use direct LDL-C' };
  return { method: m, value: v, valid: true, reason: 'TG <= 800 mg/dL. Martin-Hopkins is NOT implemented (needs its lookup table, not verified here).' };
}
export const pctReduction = (baseline: number | null, current: number | null) =>
  baseline && current !== null && baseline > 0 ? ((baseline - current) / baseline) * 100 : null;
export const additionalReduction = (current: number | null, target: number | null) =>
  current && target !== null && current > 0 ? Math.max(0, ((current - target) / current) * 100) : null;
