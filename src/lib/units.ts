// Deterministic unit handling. Canonical internal unit: mg/dL.
export type Unit = 'mg/dL' | 'mmol/L';
export type Analyte = 'chol' | 'tg';
// Analyte-specific factors (mg/dL per mmol/L). Cholesterol 38.67, triglycerides 88.57.
export const FACTOR: Record<Analyte, number> = { chol: 38.67, tg: 88.57 };

export function num(s: string | number | undefined | null): number | null {
  if (s === undefined || s === null || s === '') return null; // empty is NEVER zero / normal
  const v = typeof s === 'number' ? s : parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}
export function toMgdl(v: number | null, unit: Unit, a: Analyte): number | null {
  if (v === null) return null;
  return unit === 'mg/dL' ? v : v * FACTOR[a];
}
export function fromMgdl(v: number | null, unit: Unit, a: Analyte): number | null {
  if (v === null) return null;
  return unit === 'mg/dL' ? v : v / FACTOR[a];
}
export const round = (v: number | null, d = 1) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

// Lp(a): units are preserved. NO conversion between mg/dL and nmol/L is ever applied.
export type LpaUnit = 'mg/dL' | 'nmol/L';
export function bmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm < 50 || heightCm > 250) return null;
  return weightKg / (heightCm / 100) ** 2;
}
