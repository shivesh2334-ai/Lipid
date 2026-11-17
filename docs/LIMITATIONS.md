# Unresolved evidence / access limitations (as of 2026-11-17)
1. Textbook: only Chapter 10 (pp.360-408) was uploaded (title page/edition not visible); no other chapters, appendices or index exist to inventory. It predates the 2026 ACC/AHA guideline (its Table 10-1/10-10 are 2018-era).
2. Guideline full texts (ACC/AHA 2026, ESC/EAS 2025, LAI CS-IV 2024, CSI 2023) were NOT read in full; targets come from the textbook, abstracts and secondary summaries. Items tagged `recalled-unverified` (ESC low-risk goal, LAI non-HDL-C values, trial numbers, DOIs, label doses, Sampson formula coefficients) must be verified against primary sources before clinical use.
3. ACC/AHA 2026 percent-reduction goals, the exact "very high risk ASCVD" definition and ESC 2025 extreme-risk goal were not extracted.
4. Risk equations (PREVENT-ASCVD, SCORE2/OP, PCE, LAI algorithm) are NOT implemented because coefficients could not be verified; the clinician enters the category from the official tool.
5. Indian brands/prices: none verified; register intentionally empty. Indian availability of inclisiran, bempedoic acid, PCSK9 mAbs unverified.
6. Indian trial data and a complete trial library (e.g. ORION-4, Lp(a) outcome trials, HORIZON, olpasiran) not reviewed; trials file has 10 entries only.
7. Martin-Hopkins LDL-C not implemented (table not verified). Dialysis, older-adult/frailty and pregnancy drug specifics are partly unverified.
8. RAG is keyword retrieval over local files (no embeddings/vector store). AI answer path is optional and untested without a key. Follow-up chart assumes mg/dL.
9. Mobile/print behaviour was built responsively but not tested on physical devices; no browser E2E tests.
