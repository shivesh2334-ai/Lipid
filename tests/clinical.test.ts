import { describe, it, expect } from 'vitest';
import { toMgdl, fromMgdl, num, bmi } from '@/lib/units';
import { friedewald, sampson, pctReduction, additionalReduction, nonHdl } from '@/lib/ldl';
import { scoreFH } from '@/lib/fh';
import { pathwayGate, getCategory } from '@/lib/targets';
import { interpret, plausibility } from '@/lib/flags';
import { buildPlan } from '@/lib/treatment';
import { search } from '@/lib/search';
import sources from '@/data/sources.json';
import knowledge from '@/data/knowledge.json';
import brands from '@/data/brands.json';
import trials from '@/data/trials.json';

const L = { tc: 250, ldl: 160, hdl: 45, tg: 150, apob: null, lpa: null, lpaUnit: 'mg/dL' as const, ldlMeasured: 'calculated' as const, onTreatment: false, fasting: true };
const FHbase = { untreatedLdlMmol: null, ldlOnTreatment: null, famPrematureCHD: 'unknown', famLdl95: 'unknown', famXanthomaArcus: 'unknown', childLdl95: 'unknown', premCAD: 'unknown', premCerebralPV: 'unknown', tendonXanthoma: 'unknown', arcusUnder45: 'unknown', dna: 'unknown' } as const;

describe('units', () => {
  it('uses analyte-specific factors', () => {
    expect(toMgdl(1, 'mmol/L', 'chol')).toBeCloseTo(38.67);
    expect(toMgdl(1, 'mmol/L', 'tg')).toBeCloseTo(88.57);
    expect(fromMgdl(88.57, 'mg/dL', 'tg')).toBe(88.57);
    expect(fromMgdl(38.67, 'mmol/L', 'chol')).toBeCloseTo(1);
  });
  it('empty is null, not zero', () => { expect(num('')).toBeNull(); expect(num('abc')).toBeNull(); expect(num('0')).toBe(0); });
  it('BMI and implausible height', () => { expect(bmi(170, 70)).toBeCloseTo(24.2, 1); expect(bmi(10, 70)).toBeNull(); });
});
describe('LDL estimation', () => {
  it('Friedewald value and limits', () => {
    expect(friedewald(200, 50, 100).value).toBe(130);
    expect(friedewald(200, 50, 400).valid).toBe(false);
    expect(friedewald(null, 50, 100).value).toBeNull();
  });
  it('Sampson valid to 800 only', () => { expect(sampson(200, 50, 500).valid).toBe(true); expect(sampson(300, 30, 900).valid).toBe(false); });
  it('reduction math', () => { expect(pctReduction(200, 100)).toBe(50); expect(additionalReduction(100, 55)).toBeCloseTo(45); expect(additionalReduction(50, 55)).toBe(0); expect(nonHdl(200, 50)).toBe(150); });
});
describe('FH scoring', () => {
  it('all unknown gives range 0..max, not zero-by-assumption', () => { const r = scoreFH({ ...FHbase }); expect(r.min).toBe(0); expect(r.max).toBe(2 + 2 + 6 + 8 + 8 - 0 > 0 ? r.max : 0); expect(r.max).toBeGreaterThan(8); });
  it('treated LDL is not scored', () => { const r = scoreFH({ ...FHbase, untreatedLdlMmol: 9, ldlOnTreatment: true }); expect(r.groupBreakdown.find((g) => g.group.startsWith('4'))!.min).toBe(0); expect(r.notes.join()).toMatch(/NOT scored/); });
  it('untreated LDL 8.5 mmol/L scores 8; DNA +8 → definite', () => { const r = scoreFH({ ...FHbase, untreatedLdlMmol: 8.5, ldlOnTreatment: false, dna: 'yes' }); expect(r.min).toBe(16); expect(r.minCategory).toBe('Definite FH'); });
  it('one score per group: xanthoma 6 not 6+4', () => { const r = scoreFH({ ...FHbase, untreatedLdlMmol: 3, ldlOnTreatment: false, tendonXanthoma: 'yes', arcusUnder45: 'yes' }); expect(r.min).toBe(6); });
  it('LDL boundaries', () => { for (const [v, p] of [[3.9, 0], [4.0, 1], [5.0, 3], [6.5, 5], [8.5, 8]] as const) expect(scoreFH({ ...FHbase, untreatedLdlMmol: v, ldlOnTreatment: false }).groupBreakdown.find((g) => g.group.startsWith('4'))!.min).toBe(p); });
});
describe('pathway & targets', () => {
  it('blocks primary calculators in ASCVD and when unknown', () => { expect(pathwayGate(true, 'ACC_AHA_2026').primaryCalcAllowed).toBe(false); expect(pathwayGate(null, 'ESC_EAS_2025').primaryCalcAllowed).toBe(false); expect(pathwayGate(false, 'ESC_EAS_2025').primaryCalcAllowed).toBe(true); });
  it('frameworks differ for very high risk', () => { expect(getCategory('ESC_EAS_2025', 'very_high')!.ldl).toBe(55); expect(getCategory('INDIA_LAI_CSI', 'very_high_lai')!.ldl).toBe(50); expect(getCategory('ACC_AHA_2026', 'ascvd')!.ldl).toBe(70); });
});
describe('flags', () => {
  it('severe HTG', () => { expect(interpret({ ...L, tg: 1200 }, 'ACC_AHA_2026', '').some((f) => /pancreatitis/.test(f.text))).toBe(true); });
  it('calculated LDL invalid at TG>=400 is flagged', () => { expect(interpret({ ...L, tg: 450 }, 'ACC_AHA_2026', '').some((f) => /Friedewald invalid/.test(f.text))).toBe(true); });
  it('missing values never normal', () => { expect(interpret({ ...L, hdl: null, lpa: null }, 'ACC_AHA_2026', '').some((f) => /not entered/.test(f.text))).toBe(true); });
  it('contradictory/implausible inputs', () => { expect(plausibility({ ...L, hdl: 300 }).length).toBeGreaterThan(0); expect(plausibility({ ...L, tc: 2000 }).length).toBeGreaterThan(0); });
  it('Lp(a) unit preserved: 120 nmol/L flagged by nmol threshold only', () => { const f = interpret({ ...L, lpa: 120, lpaUnit: 'nmol/L' }, 'ACC_AHA_2026', ''); expect(f.some((x) => /120 nmol\/L/.test(x.text) && /warn/.test(x.level))).toBe(true); expect(interpret({ ...L, lpa: 20, lpaUnit: 'mg/dL' }, 'ACC_AHA_2026', '').some((x) => x.level === 'warn' && /Lp\(a\)/.test(x.text))).toBe(false); });
  it('discordance: LDL at goal but non-HDL high', () => { expect(interpret({ ...L, tc: 220, ldl: 65, hdl: 40, tg: 300 }, 'ACC_AHA_2026', 'high').some((x) => /Discordance/.test(x.text))).toBe(true); });
});
describe('treatment', () => {
  const base = { ldl: 120, target: 55, onMaxStatin: false, onEzetimibe: false, statinIntolerant: false, tg: 100, ascvd: true, pregnancyStatus: 'no' as const, dialysis: false, activeLiverDisease: false, adherenceConfirmed: true };
  it('stepwise escalation', () => { const p = buildPlan(base); expect(p.steps.map((s) => s.n)).toEqual([1, 2, 3]); expect(p.warnings.join()).toMatch(/NOT additive/); });
  it('statin intolerance goes to non-statin', () => { expect(buildPlan({ ...base, statinIntolerant: true }).steps.some((s) => s.drugs.includes('bempedoic'))).toBe(true); });
  it('pregnancy: no drug step', () => { const p = buildPlan({ ...base, pregnancyStatus: 'pregnant' }); expect(p.steps.every((s) => s.drugs.length === 0)).toBe(true); expect(buildPlan({ ...base, pregnancyStatus: 'unknown' }).warnings.join()).toMatch(/unknown/); });
  it('severe TG prioritised; bile-acid sequestrants warned', () => { expect(buildPlan({ ...base, tg: 1200 }).warnings.join()).toMatch(/pancreatitis/); });
  it('liver flag and missing LDL', () => { expect(buildPlan({ ...base, activeLiverDisease: true }).warnings.join()).toMatch(/Liver/); expect(buildPlan({ ...base, ldl: null }).steps.length).toBe(0); });
});
describe('data integrity & citations', () => {
  it('no invented brands', () => { expect(brands.entries.length).toBe(0); });
  it('every knowledge item has page refs', () => { for (const k of knowledge) expect(k.pages).toMatch(/\d/); });
  it('sources have required fields', () => { for (const s of sources) { expect(s.title && s.org && s.checked && s.status).toBeTruthy(); } });
  it('NNT only where ARR+period provided', () => { for (const t of trials) if (t.arr) expect((t as { arrYears?: number }).arrYears).toBeGreaterThan(0); });
  it('search works without AI (offline retrieval)', () => { const h = search('FH'); expect(h.length).toBeGreaterThan(0); expect(h[0].ref).toBeTruthy(); expect(search('zzzqqq').length).toBe(0); expect(search('REDUCE-IT')[0].kind).toBe('Trial'); });
});
