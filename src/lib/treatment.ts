// Rule-based stepwise intensification. All output is a proposal requiring clinician review.
export interface Drug { id: string; name: string; dose: string; expected: [number, number] | null; source: string; outcomeEvidence: string; precautions: string; availability: string }
// Expected LDL-C reductions: textbook Table 10-11 p.373 and p.374 (bempedoic). Doses of non-textbook items are standard label doses: verify.
export const DRUGS: Record<string, Drug> = {
  atorvastatin: { id: 'atorvastatin', name: 'Atorvastatin', dose: '10-80 mg/day (high intensity 40-80)', expected: [35, 50], source: 'Textbook Table 10-11 p.373', outcomeEvidence: 'Statin class: ASCVD events and mortality reduced (textbook p.373)', precautions: 'Myopathy (rare); check interactions (CYP3A4); avoid in pregnancy per ACC/AHA 2026 except rare very-high-risk cases; baseline ALT.', availability: 'Widely available generic in India (brands not verified)' },
  rosuvastatin: { id: 'rosuvastatin', name: 'Rosuvastatin', dose: '10-40 mg/day (high intensity 20-40)', expected: [37, 52], source: 'Textbook Table 10-11 p.373', outcomeEvidence: 'Statin class outcome evidence', precautions: 'Renal dose caution in severe CKD (eGFR<30: verify label); East/South Asian exposure higher — start lower per label.', availability: 'Widely available generic in India (brands not verified)' },
  ezetimibe: { id: 'ezetimibe', name: 'Ezetimibe', dose: '10 mg once daily', expected: [18, 25], source: 'Textbook Table 10-11 p.373', outcomeEvidence: 'IMPROVE-IT (ezetimibe added to simvastatin, post-ACS) — see Trials tab', precautions: 'Generally well tolerated; with fibrates/cyclosporine check label.', availability: 'Generic available in India (brands not verified)' },
  pcsk9mab: { id: 'pcsk9mab', name: 'PCSK9 monoclonal antibody (evolocumab/alirocumab)', dose: 'Evolocumab 140 mg SC q2w or 420 mg monthly; alirocumab 75-150 mg SC q2w', expected: [50, 70], source: 'Textbook Table 10-11 p.373', outcomeEvidence: 'FOURIER, ODYSSEY OUTCOMES (see Trials)', precautions: 'Injection-site reactions; cost; availability in India must be verified.', availability: 'UNVERIFIED in India' },
  inclisiran: { id: 'inclisiran', name: 'Inclisiran (siRNA)', dose: '284 mg SC at day 0, 3 months, then every 6 months (label dose; verify)', expected: null, source: 'Textbook Table 10-12 p.374 (status outdated); expected reduction not stated in textbook for LDL-C', outcomeEvidence: 'Outcome data not available per ACC/AHA 2026 press release (still being studied); verify ORION-4/VICTORION-2P status', precautions: 'Specialist-guided', availability: 'UNVERIFIED in India' },
  bempedoic: { id: 'bempedoic', name: 'Bempedoic acid', dose: '180 mg once daily (label dose; verify)', expected: [15, 20], source: 'Textbook p.374 (monotherapy 15-20%)', outcomeEvidence: 'CLEAR Outcomes (see Trials); textbook (pre-2023) states no outcome data', precautions: 'Gout/uric acid, tendon rupture warnings; check label.', availability: 'UNVERIFIED in India' },
  bas: { id: 'bas', name: 'Bile acid sequestrant (colesevelam/cholestyramine)', dose: 'Colesevelam 625 mg 2-3x/day; cholestyramine 4-8 g 1-2x/day', expected: [7, 20], source: 'Textbook Table 10-11 p.373', outcomeEvidence: 'Textbook cites ASCVD benefit and long safety record (p.373)', precautions: 'Raises TG: avoid if TG >400 mg/dL (>5 mmol/L); GI effects; drug-binding interactions.', availability: 'UNVERIFIED in India' },
  fibrate: { id: 'fibrate', name: 'Fenofibrate / bezafibrate', dose: 'per label (renal adjustment)', expected: null, source: 'Textbook p.394: TG up to 70% reduction', outcomeEvidence: 'No monotherapy ASCVD benefit shown in textbook account; combination with statin: IIb (p.394)', precautions: 'Myopathy risk with statin (gemfibrozil avoid); renal function.', availability: 'Generic available (brands not verified)' },
  ipe: { id: 'ipe', name: 'Icosapent ethyl (prescription EPA)', dose: '2 g twice daily (textbook p.395)', expected: null, source: 'Textbook p.394-395', outcomeEvidence: 'REDUCE-IT positive; STRENGTH (EPA+DHA) neutral — formulation-specific; OTC fish oil is NOT equivalent', precautions: 'Atrial fibrillation/bleeding signals: check label.', availability: 'UNVERIFIED in India' },
};
export interface Step { n: number; title: string; drugs: string[]; rationale: string }
export interface PlanInput { ldl: number | null; target: number | null; onMaxStatin: boolean | null; onEzetimibe: boolean | null; statinIntolerant: boolean | null; tg: number | null; ascvd: boolean | null; pregnancyStatus: 'no' | 'planning' | 'pregnant' | 'breastfeeding' | 'unknown'; dialysis: boolean | null; activeLiverDisease: boolean | null; adherenceConfirmed: boolean | null }
export interface Plan { steps: Step[]; warnings: string[]; gapPct: number | null }

export function buildPlan(i: PlanInput): Plan {
  const warnings: string[] = ['All proposed medication changes require clinician review.'];
  const steps: Step[] = [];
  const gap = i.ldl !== null && i.target !== null && i.ldl > 0 ? Math.max(0, ((i.ldl - i.target) / i.ldl) * 100) : null;
  if (i.pregnancyStatus !== 'no') {
    warnings.push(i.pregnancyStatus === 'unknown' ? 'Pregnancy status unknown: confirm before any lipid-lowering drug.' : 'Pregnancy/planning/breastfeeding: statins are generally discontinued (ACC/AHA 2026 continues to advise discontinuation except rare very-high-risk cases); data for ezetimibe, PCSK9, bempedoic acid, inclisiran insufficient here. Specialist (obstetric/lipid) decision; consult current drug-specific labelling.');
    steps.push({ n: 1, title: 'Specialist review before any drug', drugs: [], rationale: 'Lifestyle; bile-acid sequestrants are the class usually considered when treatment is unavoidable — verify with specialist.' });
    return { steps, warnings, gapPct: gap };
  }
  if (i.activeLiverDisease) warnings.push('Liver disease flagged: evaluate cause/severity before statin dose escalation; specialist input.');
  if (i.dialysis) warnings.push('Dialysis: lipid-lowering initiation evidence differs (not covered by the uploaded textbook pages); decide with nephrology. Recalled, unverified.');
  if (i.ldl === null || i.target === null) { warnings.push('LDL-C and/or target missing: stepwise plan cannot be graded.'); return { steps, warnings, gapPct: null }; }
  if (gap === 0) { steps.push({ n: 1, title: 'At target', drugs: [], rationale: 'Continue current therapy, lifestyle, adherence; monitor lipids.' }); return { steps, warnings, gapPct: 0 }; }
  if (i.adherenceConfirmed === false || i.adherenceConfirmed === null) steps.push({ n: 0, title: 'Review adherence, secondary causes and lab method first', drugs: [], rationale: 'Non-adherence and secondary causes (hypothyroidism, nephrotic syndrome, cholestasis, drugs; textbook p.364-365) commonly explain poor response.' });
  if (i.statinIntolerant) {
    steps.push({ n: 1, title: 'Confirm intolerance; rechallenge / alternative statin or lower dose', drugs: ['rosuvastatin'], rationale: 'Textbook p.372: trial off drug to confirm temporal relation, switch within class, then non-statin.' });
    steps.push({ n: 2, title: 'Non-statin therapy', drugs: ['ezetimibe', 'bempedoic', 'pcsk9mab'], rationale: 'Statin-intolerant: ezetimibe first-line alternative; PCSK9 mAb/bempedoic/inclisiran per availability and cost.' });
  } else {
    if (i.onMaxStatin !== true) steps.push({ n: 1, title: 'Maximally tolerated high-intensity statin', drugs: ['atorvastatin', 'rosuvastatin'], rationale: 'Statin is first line (textbook p.373).' });
    if (i.onEzetimibe !== true) steps.push({ n: 2, title: 'Add ezetimibe', drugs: ['ezetimibe'], rationale: 'Second-line when target not reached (p.373; Fig 10-5).' });
    steps.push({ n: 3, title: 'Add PCSK9 inhibitor (or inclisiran / bempedoic acid) if still above target', drugs: ['pcsk9mab', 'inclisiran', 'bempedoic'], rationale: gap !== null && gap > 60 ? 'Required additional reduction >60%: combination therapy up-front may be needed.' : 'Per pathway; check availability and affordability.' });
  }
  if (i.tg !== null) {
    if (i.tg >= 1000) { warnings.push('TG >= 1000 mg/dL: prioritise TG lowering/pancreatitis prevention (very low fat diet, fibrate, remove secondary causes); specialist referral.'); steps.push({ n: 4, title: 'Severe hypertriglyceridaemia', drugs: ['fibrate'], rationale: 'Textbook p.392: <15% fat diet; specialist care. Avoid bile-acid sequestrants (TG >400).' }); }
    else if (i.tg >= 135 && i.ascvd) steps.push({ n: 4, title: 'Persistent TG 135-499 on statin (high/very high risk)', drugs: ['ipe', 'fibrate'], rationale: 'ESC IIa for icosapent ethyl; fibrate IIb (textbook p.394-395). Prescription EPA only.' });
  }
  warnings.push('Percentage reductions from combined drugs are NOT additive; observed response after 8 weeks determines the next step (textbook p.372).');
  return { steps, warnings, gapPct: gap };
}
// Illustrative multiplicative projection (not a prediction). Returns [low,high] projected LDL.
export function project(ldl: number, ids: string[]): [number, number] {
  let lo = ldl, hi = ldl;
  for (const id of ids) { const e = DRUGS[id]?.expected; if (e) { lo *= 1 - e[1] / 100; hi *= 1 - e[0] / 100; } }
  return [lo, hi];
}
