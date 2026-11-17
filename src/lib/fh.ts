// Dutch Lipid Clinic Network (DLCN) score. Rules verified against Nordestgaard et al., Eur Heart J 2013;34:3478-90
// (PMC3844152 Table 1) on 2026-11-17. One score per group (highest applicable). Unknown != absent.
export type Tri = 'yes' | 'no' | 'unknown';
export interface FHInput {
  untreatedLdlMmol: number | null; // genuinely untreated value; never estimated silently
  ldlOnTreatment: boolean | null;
  famPrematureCHD: Tri; famLdl95: Tri; famXanthomaArcus: Tri; childLdl95: Tri;
  premCAD: Tri; premCerebralPV: Tri; tendonXanthoma: Tri; arcusUnder45: Tri;
  dna: Tri; // yes = causative LDLR/APOB/PCSK9 variant shown
}
export interface Criterion { group: string; label: string; points: number; status: Tri }
export interface FHResult { min: number; max: number; minCategory: string; maxCategory: string; criteria: Criterion[]; notes: string[]; groupBreakdown: { group: string; min: number; max: number }[] }

export const category = (s: number) => (s > 8 ? 'Definite FH' : s >= 6 ? 'Probable FH' : s >= 3 ? 'Possible FH' : 'Unlikely FH');
export function ldlPoints(mmol: number | null): number {
  if (mmol === null) return 0;
  return mmol >= 8.5 ? 8 : mmol >= 6.5 ? 5 : mmol >= 5.0 ? 3 : mmol >= 4.0 ? 1 : 0;
}
export function scoreFH(i: FHInput): FHResult {
  const notes: string[] = [];
  const crit: Criterion[] = [
    { group: '1 Family history', label: '1st-degree relative with premature CHD (<55 M / <60 F)', points: 1, status: i.famPrematureCHD },
    { group: '1 Family history', label: '1st-degree relative with LDL-C >95th percentile', points: 1, status: i.famLdl95 },
    { group: '1 Family history', label: '1st-degree relative with tendon xanthoma and/or arcus', points: 2, status: i.famXanthomaArcus },
    { group: '1 Family history', label: 'Child <18 y with LDL-C >95th percentile', points: 2, status: i.childLdl95 },
    { group: '2 Clinical history', label: 'Patient: premature CAD', points: 2, status: i.premCAD },
    { group: '2 Clinical history', label: 'Patient: premature cerebral/peripheral vascular disease', points: 1, status: i.premCerebralPV },
    { group: '3 Examination', label: 'Tendon xanthoma', points: 6, status: i.tendonXanthoma },
    { group: '3 Examination', label: 'Corneal arcus <45 y', points: 4, status: i.arcusUnder45 },
    { group: '5 DNA', label: 'Causative LDLR/APOB/PCSK9 variant', points: 8, status: i.dna },
  ];
  const groups = [...new Set(crit.map((c) => c.group))];
  const breakdown = groups.map((g) => {
    const cs = crit.filter((c) => c.group === g);
    const min = Math.max(0, ...cs.filter((c) => c.status === 'yes').map((c) => c.points));
    const max = Math.max(0, ...cs.filter((c) => c.status !== 'no').map((c) => c.points));
    return { group: g, min, max };
  });
  let lMin = 0, lMax = 8;
  if (i.untreatedLdlMmol !== null && i.ldlOnTreatment === false) { lMin = lMax = ldlPoints(i.untreatedLdlMmol); }
  else if (i.untreatedLdlMmol !== null && i.ldlOnTreatment === true)
    notes.push('LDL-C supplied was measured on treatment: NOT scored. Enter a documented pre-treatment value to score group 4.');
  else notes.push('Untreated LDL-C unknown: group 4 contributes 0 to the minimum and up to 8 to the maximum. No untreated value is estimated.');
  breakdown.push({ group: '4 LDL-C (untreated)', min: lMin, max: lMax });
  const min = breakdown.reduce((a, b) => a + b.min, 0);
  const max = breakdown.reduce((a, b) => a + b.max, 0);
  if (i.dna === 'no') notes.push('A negative DNA result does not exclude FH (polygenic or undetected variants; textbook p.367).');
  notes.push('Score is a clinical probability, not a diagnosis. Genetic testing is the reference where available (textbook p.364).');
  return { min, max, minCategory: category(min), maxCategory: category(max), criteria: crit, notes, groupBreakdown: breakdown };
}
