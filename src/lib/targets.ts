// Versioned guideline target tables (mg/dL). RULES_VERSION changes only after clinician review.
export const RULES_VERSION = '0.1.0';
export const EVIDENCE_CHECKED = '2026-11-17';
export type Pathway = 'ACC_AHA_2026' | 'ESC_EAS_2025' | 'INDIA_LAI_CSI';
export interface Category { id: string; label: string; ldl: number | null; nonHdl: number | null; apoB: number | null; pctReduction: number | null; basis: string; verified: 'search' | 'textbook' | 'recalled-unverified' }
export const PATHWAY_LABEL: Record<Pathway, string> = {
  ACC_AHA_2026: '2026 ACC/AHA multisociety dyslipidemia guideline (US)',
  ESC_EAS_2025: '2019 ESC/EAS + 2025 focused update (Europe)',
  INDIA_LAI_CSI: 'Indian: LAI CS-IV 2024 / CSI 2023 (expert consensus)',
};
export const CATEGORIES: Record<Pathway, Category[]> = {
  ACC_AHA_2026: [
    { id: 'low', label: 'Low (PREVENT-ASCVD 10y <3%)', ldl: 100, nonHdl: 130, apoB: null, pctReduction: null, basis: 'LDL-C <100; non-HDL-C goal 30 mg/dL above LDL-C goal (secondary summaries of the 2026 guideline)', verified: 'search' },
    { id: 'borderline', label: 'Borderline (3 to <5%)', ldl: 100, nonHdl: 130, apoB: null, pctReduction: null, basis: 'as above', verified: 'search' },
    { id: 'intermediate', label: 'Intermediate (5 to <10%)', ldl: 100, nonHdl: 130, apoB: null, pctReduction: null, basis: 'as above', verified: 'search' },
    { id: 'high', label: 'High (>=10%)', ldl: 70, nonHdl: 100, apoB: null, pctReduction: null, basis: 'LDL-C <70 at high risk', verified: 'search' },
    { id: 'ldl190', label: 'Primary prevention, LDL-C >=190', ldl: 100, nonHdl: 130, apoB: null, pctReduction: null, basis: '<100; <70 if HeFH, >=1 risk factor or subclinical atherosclerosis', verified: 'search' },
    { id: 'ascvd', label: 'Clinical ASCVD', ldl: 70, nonHdl: 100, apoB: null, pctReduction: null, basis: 'LDL-C <70', verified: 'search' },
    { id: 'ascvd_vh', label: 'Clinical ASCVD, very high risk', ldl: 55, nonHdl: 85, apoB: null, pctReduction: null, basis: 'LDL-C <55 (ASCVD with additional risk; exact definition: read full guideline)', verified: 'search' },
  ],
  ESC_EAS_2025: [
    { id: 'low', label: 'Low', ldl: 116, nonHdl: null, apoB: null, pctReduction: null, basis: '2019 ESC/EAS goal <116 mg/dL (3.0 mmol/L)', verified: 'recalled-unverified' },
    { id: 'moderate', label: 'Moderate', ldl: 100, nonHdl: 130, apoB: 100, pctReduction: null, basis: '<100 mg/dL (2.6 mmol/L); initiation consider if >=100 (IIa)', verified: 'search' },
    { id: 'high', label: 'High', ldl: 70, nonHdl: 100, apoB: 80, pctReduction: 50, basis: '>=50% reduction and <70 mg/dL (1.8 mmol/L); start if >=100 (I-A)', verified: 'search' },
    { id: 'very_high', label: 'Very high (incl. all established ASCVD)', ldl: 55, nonHdl: 85, apoB: 65, pctReduction: 50, basis: '>=50% reduction and <55 mg/dL (1.4 mmol/L); textbook Table 10-15 p.393', verified: 'textbook' },
  ],
  INDIA_LAI_CSI: [
    { id: 'low_mod', label: 'Low / moderate risk', ldl: 100, nonHdl: 130, apoB: null, pctReduction: null, basis: 'CSI 2023 table: LDL-C <100', verified: 'search' },
    { id: 'high', label: 'High risk', ldl: 70, nonHdl: 100, apoB: null, pctReduction: null, basis: 'CSI 2023: <70; LAI also <70', verified: 'search' },
    { id: 'very_high_csi', label: 'Very high risk (CSI 2023)', ldl: 55, nonHdl: null, apoB: null, pctReduction: null, basis: 'CSI 2023 table: <55', verified: 'search' },
    { id: 'very_high_lai', label: 'Very high risk (LAI)', ldl: 50, nonHdl: 80, apoB: null, pctReduction: null, basis: 'LAI: <50 (confirmed by search); non-HDL-C 80 from recall', verified: 'recalled-unverified' },
    { id: 'extreme', label: 'Extreme risk A/B/C (LAI)', ldl: 30, nonHdl: 60, apoB: null, pctReduction: null, basis: 'LAI: <=30 (A, B); C: events despite <=30, ultra-low 10-15 option. Non-HDL-C from recall', verified: 'recalled-unverified' },
  ],
};
export function getCategory(p: Pathway, id: string) { return CATEGORIES[p].find((c) => c.id === id) || null; }

// Clinical ASCVD: primary-prevention calculators must not be used (rule).
export function pathwayGate(hasAscvd: boolean | null, p: Pathway): { primaryCalcAllowed: boolean; message: string } {
  if (hasAscvd === null) return { primaryCalcAllowed: false, message: 'ASCVD status unknown: cannot choose primary vs secondary prevention pathway. Not assumed absent.' };
  if (hasAscvd) return { primaryCalcAllowed: false, message: p === 'ESC_EAS_2025' ? 'Established ASCVD: ESC/EAS classes all as very high risk. Primary-prevention risk scores are not applicable.' : 'Established ASCVD: secondary prevention pathway. Primary-prevention risk scores are not applicable.' };
  return { primaryCalcAllowed: true, message: 'No clinical ASCVD: primary prevention. Obtain the risk estimate from the official calculator (PREVENT-ASCVD for ACC/AHA 2026; SCORE2/SCORE2-OP for ESC; LAI algorithm for India) and enter the category. Equations are not re-implemented here (coefficients not verified).' };
}
