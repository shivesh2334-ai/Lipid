import { friedewald, sampson, nonHdl, remnantC } from './ldl';
import { getCategory, Pathway } from './targets';
export interface Labs { tc: number | null; ldl: number | null; hdl: number | null; tg: number | null; apob: number | null; lpa: number | null; lpaUnit: 'mg/dL' | 'nmol/L'; ldlMeasured: 'direct' | 'calculated' | 'unknown'; onTreatment: boolean | null; fasting: boolean | null }
export interface Flag { level: 'info' | 'warn' | 'alert'; text: string }
const f = (level: Flag['level'], text: string): Flag => ({ level, text });

export function plausibility(l: Labs): Flag[] {
  const o: Flag[] = [];
  if (l.tc !== null && l.hdl !== null && l.hdl >= l.tc) o.push(f('alert', 'HDL-C >= total cholesterol: implausible; check entry/units.'));
  if (l.tc !== null && l.ldl !== null && l.hdl !== null && l.ldl + l.hdl > l.tc + 1) o.push(f('alert', 'LDL-C + HDL-C exceeds TC (negative remnant-C): contradictory values; check entry or LDL method.'));
  if (l.tc !== null && (l.tc < 40 || l.tc > 800)) o.push(f('alert', 'TC outside 40-800 mg/dL: implausible; check units.'));
  if (l.tg !== null && (l.tg < 10 || l.tg > 10000)) o.push(f('alert', 'TG outside plausible range; check units.'));
  if (l.ldl !== null && (l.ldl < 5 || l.ldl > 700)) o.push(f('alert', 'LDL-C outside plausible range; check units.'));
  return o;
}
export function interpret(l: Labs, p: Pathway, catId: string): Flag[] {
  const o: Flag[] = [...plausibility(l)];
  const miss = (k: string, v: unknown) => v === null && o.push(f('info', `${k}: not entered (not interpreted as normal).`));
  miss('LDL-C', l.ldl); miss('HDL-C', l.hdl); miss('TG', l.tg); miss('Lp(a)', l.lpa); miss('ApoB', l.apob);
  if (l.ldlMeasured === 'unknown' && l.ldl !== null) o.push(f('warn', 'LDL-C method (direct vs calculated) not stated.'));
  if (l.tg !== null && l.ldlMeasured === 'calculated') {
    const fr = friedewald(l.tc, l.hdl, l.tg); const sa = sampson(l.tc, l.hdl, l.tg);
    if (!fr.valid && l.tg >= 400) o.push(f('warn', `Calculated LDL-C with TG ${Math.round(l.tg)} mg/dL: Friedewald invalid (>=400). ${sa.valid ? 'Sampson usable up to 800.' : 'Use direct LDL-C.'}`));
  }
  if (l.tg !== null) {
    if (l.tg >= 1000) o.push(f('alert', `Severe hypertriglyceridaemia (TG >= 1000 mg/dL): acute pancreatitis risk; exclude secondary causes (diabetes, alcohol, drugs, hypothyroidism, pregnancy); consider familial chylomicronaemia (textbook p.391-392); urgent specialist input if symptomatic.`));
    else if (l.tg >= 500) o.push(f('warn', 'TG >= 500 mg/dL: raised pancreatitis risk; evaluate secondary causes; LDL-C by calculation unreliable.'));
    else if (l.tg >= 150) o.push(f('info', 'TG 150-499 mg/dL: mild-moderate hypertriglyceridaemia; remnant-C may drive residual risk (textbook p.384).'));
  }
  if (l.ldl !== null && l.ldl >= 190 && l.onTreatment === false) o.push(f('warn', 'Untreated LDL-C >= 190 mg/dL: possible FH or severe hypercholesterolaemia; requires evaluation (FH score tab), secondary-cause exclusion and cascade consideration. Only ~<5% have a pathogenic variant (textbook p.364).'));
  if (l.ldl !== null && l.ldl >= 190 && l.onTreatment === true) o.push(f('warn', 'LDL-C >= 190 mg/dL despite treatment: check adherence, secondary causes, and need for specialist referral.'));
  if (l.lpa !== null) {
    const th = l.lpaUnit === 'mg/dL' ? 50 : 100;
    if (l.lpa >= th) o.push(f('warn', `Lp(a) ${l.lpa} ${l.lpaUnit} is at/above the commonly cited ${th} ${l.lpaUnit} risk-enhancing cut-off (textbook p.378/381). Assay/isoform dependent; units NOT converted. Optimise other risk factors; no approved Lp(a)-specific therapy verified.`));
    else o.push(f('info', `Lp(a) ${l.lpa} ${l.lpaUnit} below ${th} ${l.lpaUnit}. Single lifetime measurement is usually sufficient (stable level, textbook p.381).`));
  }
  const nh = nonHdl(l.tc, l.hdl); const rem = remnantC(l.tc, l.ldl, l.hdl); const cat = getCategory(p, catId);
  if (rem !== null && rem >= 30 && l.tg !== null) o.push(f('info', `Calculated remnant-C (TC-LDL-C-HDL-C) ~${Math.round(rem)} mg/dL.`));
  if (cat && l.ldl !== null && cat.ldl !== null && l.ldl < cat.ldl) {
    if (nh !== null && cat.nonHdl !== null && nh >= cat.nonHdl) o.push(f('warn', `Discordance: LDL-C at goal (<${cat.ldl}) but non-HDL-C ${Math.round(nh)} >= ${cat.nonHdl} (remnant/TRL burden; textbook p.393).`));
    if (l.apob !== null && cat.apoB !== null && l.apob >= cat.apoB) o.push(f('warn', `Discordance: LDL-C at goal but apoB ${l.apob} mg/dL >= ${cat.apoB}.`));
  }
  return o;
}
// Adherence / response: compares observed % reduction with lower bound of textbook expected range (Table 10-11, p.373).
export function responseCheck(observedPct: number | null, expectedLow: number | null): Flag | null {
  if (observedPct === null || expectedLow === null) return null;
  if (observedPct < expectedLow * 0.5) return f('warn', `Observed LDL-C reduction ${observedPct.toFixed(0)}% is less than half the lower expected bound (${expectedLow}%): possible non-adherence, intolerance, secondary cause or lab discordance — requires evaluation.`);
  return f('info', `Observed reduction ${observedPct.toFixed(0)}% is within or near the expected range.`);
}
