'use client';
import { useMemo, useState, useEffect } from 'react';
import { num, bmi, toMgdl, fromMgdl, round, Unit } from '@/lib/units';
import { friedewald, sampson, nonHdl, remnantC, pctReduction, additionalReduction } from '@/lib/ldl';
import { scoreFH, Tri } from '@/lib/fh';
import { CATEGORIES, PATHWAY_LABEL, Pathway, getCategory, pathwayGate, RULES_VERSION, EVIDENCE_CHECKED } from '@/lib/targets';
import { interpret, responseCheck, Labs } from '@/lib/flags';
import { buildPlan, DRUGS, project } from '@/lib/treatment';
import { search } from '@/lib/search';
import knowledge from '@/data/knowledge.json';
import trials from '@/data/trials.json';
import sources from '@/data/sources.json';
import pathways from '@/data/pathways.json';
import brands from '@/data/brands.json';

const TABS = ['Patient assessment', 'Lipid interpretation', 'Risk & targets', 'Treatment planner', 'Special populations', 'Familial / inherited', 'Knowledge bank', 'Guidelines comparison', 'Trials & evidence', 'Follow-up', 'Report'];
const EMPTY = { age: '', sex: '', height: '', weight: '', waist: '', sbp: '', dbp: '', ascvd: '', diabetes: '', htn: '', ckd: '', dialysis: '', liver: '', thyroid: '', smoker: '', alcohol: '', adherence: '', preg: 'unknown', famPremature: 'unknown', statinIntol: '',
  currentStatin: '', statinDose: '', onEze: '', onMaxStatin: '', otherTx: '', unit: 'mg/dL', labDate: '', fasting: '', onTx: '', ldlMeasured: 'unknown', tc: '', ldl: '', hdl: '', tg: '', apob: '', lpa: '', lpaUnit: 'mg/dL', hba1c: '', egfr: '', alt: '', tsh: '', baselineLdl: '',
  pathway: 'ACC_AHA_2026', cat: '', xan: 'unknown', arcus: 'unknown', untreatedLdl: '', untreatedKnown: '', famCHD: 'unknown', famLdl95: 'unknown', famXA: 'unknown', childLdl: 'unknown', premCAD: 'unknown', premCV: 'unknown', dna: 'unknown', notes: '' };
type S = typeof EMPTY;
type Entry = { date: string; ldl: string; tg: string; hdl: string; tc: string; therapy: string; adherence: string; adverse: string };

const tri = (v: string): Tri => (v === 'yes' || v === 'no' ? v : 'unknown');
const yn = (v: string): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

export default function Page() {
  const [tab, setTab] = useState(0);
  const [s, setS] = useState<S>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [q, setQ] = useState('');
  const [serial, setSerial] = useState<Entry[]>([]);
  const [report, setReport] = useState('');
  const [ask, setAsk] = useState<{ answer: string | null; mode: string } | null>(null);
  const set = (k: keyof S, v: string) => { setS((p) => ({ ...p, [k]: v })); setDirty(true); };
  useEffect(() => { try { const r = localStorage.getItem('lcc-serial'); if (r) setSerial(JSON.parse(r)); } catch { /* ignore */ } }, []);

  const unit = s.unit as Unit;
  const mg = (v: string, a: 'chol' | 'tg') => toMgdl(num(v), unit, a);
  const labs: Labs = { tc: mg(s.tc, 'chol'), ldl: mg(s.ldl, 'chol'), hdl: mg(s.hdl, 'chol'), tg: mg(s.tg, 'tg'), apob: num(s.apob) === null ? null : (s.unit === 'mmol/L' ? num(s.apob)! * 100 : num(s.apob)), lpa: num(s.lpa), lpaUnit: s.lpaUnit as 'mg/dL' | 'nmol/L', ldlMeasured: s.ldlMeasured as Labs['ldlMeasured'], onTreatment: yn(s.onTx), fasting: yn(s.fasting) };
  const hasAscvd = yn(s.ascvd);
  const gate = pathwayGate(hasAscvd, s.pathway as Pathway);
  const cats = CATEGORIES[s.pathway as Pathway];
  const cat = getCategory(s.pathway as Pathway, s.cat);
  const flags = useMemo(() => interpret(labs, s.pathway as Pathway, s.cat), [s]); // eslint-disable-line
  const nh = nonHdl(labs.tc, labs.hdl), rem = remnantC(labs.tc, labs.ldl, labs.hdl);
  const fw = friedewald(labs.tc, labs.hdl, labs.tg), sa = sampson(labs.tc, labs.hdl, labs.tg);
  const baseline = mg(s.baselineLdl, 'chol');
  const red = pctReduction(baseline, labs.ldl), need = additionalReduction(labs.ldl, cat?.ldl ?? null);
  const fh = scoreFH({ untreatedLdlMmol: num(s.untreatedLdl) === null ? null : (s.unit === 'mmol/L' ? num(s.untreatedLdl) : num(s.untreatedLdl)! / 38.67), ldlOnTreatment: s.untreatedKnown === 'yes' ? false : s.untreatedKnown === 'no' ? true : null, famPrematureCHD: tri(s.famCHD), famLdl95: tri(s.famLdl95), famXanthomaArcus: tri(s.famXA), childLdl95: tri(s.childLdl), premCAD: tri(s.premCAD), premCerebralPV: tri(s.premCV), tendonXanthoma: tri(s.xan), arcusUnder45: tri(s.arcus), dna: tri(s.dna) });
  const plan = buildPlan({ ldl: labs.ldl, target: cat?.ldl ?? null, onMaxStatin: yn(s.onMaxStatin), onEzetimibe: yn(s.onEze), statinIntolerant: yn(s.statinIntol), tg: labs.tg, ascvd: hasAscvd, pregnancyStatus: s.preg as 'no', dialysis: yn(s.dialysis), activeLiverDisease: yn(s.liver), adherenceConfirmed: yn(s.adherence) });
  const bm = bmi(num(s.height), num(s.weight));
  const hits = q.length > 1 ? search(q) : [];

  const reset = () => { if (!dirty || confirm('Clear all unsaved assessment data? This cannot be undone.')) { setS(EMPTY); setDirty(false); setReport(''); } };
  const saveSerial = (e: Entry[]) => { setSerial(e); try { localStorage.setItem('lcc-serial', JSON.stringify(e)); } catch { /* ignore */ } };

  const F = (k: keyof S, label: string, type = 'text') => (<label>{label}<input type={type} value={s[k]} onChange={(e) => set(k, e.target.value)} inputMode={type === 'number' ? 'decimal' : undefined} /></label>);
  const Sel = (k: keyof S, label: string, opts: string[][]) => (<label>{label}<select value={s[k]} onChange={(e) => set(k, e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>);
  const YN = [['', 'Unknown / not asked'], ['yes', 'Yes'], ['no', 'No']];
  const TRI = [['unknown', 'Unknown'], ['yes', 'Present'], ['no', 'Absent']];
  const Flags = ({ f }: { f: { level: string; text: string }[] }) => (<>{f.map((x, i) => <div key={i} className={`flag ${x.level}`}>{x.text}</div>)}</>);

  const buildReport = () => {
    const L = (n: string, v: number | null, a: 'chol' | 'tg') => (v === null ? `${n}: not entered` : `${n}: ${round(fromMgdl(v, unit, a), unit === 'mg/dL' ? 0 : 2)} ${unit}`);
    setReport([
      `LIPID CLINICAL COMPANION — DRAFT REPORT (requires clinician review)  | Rules v${RULES_VERSION} | Evidence last verified ${EVIDENCE_CHECKED}`,
      `\n1. PATIENT SUMMARY\nAge ${s.age || 'not entered'}, sex ${s.sex || 'not entered'}, BMI ${bm ? bm.toFixed(1) : 'not computed'}, BP ${s.sbp || '?'}/${s.dbp || '?'}. ASCVD: ${s.ascvd || 'unknown'}. Diabetes: ${s.diabetes || 'unknown'}. CKD: ${s.ckd || 'unknown'}. Pregnancy status: ${s.preg}.`,
      `\n2. PARAMETERS (date ${s.labDate || 'not entered'}, ${s.fasting === 'yes' ? 'fasting' : s.fasting === 'no' ? 'non-fasting' : 'fasting status unknown'}, ${s.onTx === 'yes' ? 'ON treatment' : s.onTx === 'no' ? 'untreated' : 'treatment status unknown'}, LDL-C ${s.ldlMeasured})\n${[L('TC', labs.tc, 'chol'), L('LDL-C', labs.ldl, 'chol'), L('HDL-C', labs.hdl, 'chol'), L('TG', labs.tg, 'tg')].join('\n')}\nNon-HDL-C: ${nh === null ? 'n/a' : Math.round(nh) + ' mg/dL'}; ApoB: ${s.apob || 'not entered'}; Lp(a): ${s.lpa ? s.lpa + ' ' + s.lpaUnit : 'not entered'}`,
      `\n3. ABNORMAL FINDINGS / DISCORDANCE\n${flags.map((f) => '- ' + f.text).join('\n') || '- none flagged'}`,
      `\n4. RISK CATEGORY & FRAMEWORK\n${PATHWAY_LABEL[s.pathway as Pathway]}; category: ${cat ? cat.label : 'NOT SELECTED'}. ${gate.message}`,
      `\n5. GOALS\n${cat ? `LDL-C <${cat.ldl} mg/dL${cat.nonHdl ? `, non-HDL-C <${cat.nonHdl}` : ''}${cat.apoB ? `, apoB <${cat.apoB}` : ''}${cat.pctReduction ? `, >=${cat.pctReduction}% reduction` : ''} (${cat.basis}; verification: ${cat.verified})` : 'not set'}${need !== null ? `\nAdditional LDL-C reduction needed: ${need.toFixed(0)}%` : ''}`,
      `\n6. INTERPRETATION\nPossible FH score range ${fh.min}-${fh.max} (${fh.minCategory} to ${fh.maxCategory}) — clinical probability only. Exclude secondary causes (TSH, creatinine, urine albumin, LFT, glucose).`,
      `\n7. PLAN (PROPOSED — REQUIRES CLINICIAN REVIEW)\n${plan.steps.map((p) => `Step ${p.n}: ${p.title} [${p.drugs.map((d) => DRUGS[d]?.name).join(', ') || '-'}] — ${p.rationale}`).join('\n')}\n${plan.warnings.map((w) => '! ' + w).join('\n')}`,
      `\n8. MONITORING\nRecheck lipids ~8 weeks after any change (textbook p.372); escalate stepwise if target not reached; review adherence, adverse effects, ALT as indicated.`,
      `\n9. REFERRAL\nConsider lipid-specialist referral: LDL-C >=190 mg/dL, suspected FH/HoFH, TG >=1000 mg/dL, statin intolerance with failure of alternatives, pregnancy, children.`,
      `\n10. REFERENCES\n${sources.map((x) => `- ${x.title} (${x.org}, ${x.year}) [${x.status}]`).join('\n')}\nEvidence review date: ${EVIDENCE_CHECKED}. No continuous update service is implemented.`,
    ].join('\n'));
  };

  return (<>
    <header><h1>Lipid Clinical Companion</h1><div className="sub">Decision support for clinicians · rules v{RULES_VERSION} · evidence last verified {EVIDENCE_CHECKED} · not a substitute for clinical judgement</div>
      <input placeholder="Global search: conditions, drugs, trials, abbreviations (FH, Lp(a), TG…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 6 }} /></header>
    <div className="banner">Textbook content is Chapter 10 only (pp.360-408) and predates the 2026 ACC/AHA guideline. All proposals require clinician review.</div>
    <nav>{TABS.map((t, i) => <button key={t} className={i === tab ? 'on' : ''} onClick={() => { setTab(i); setQ(''); }}>{t}</button>)}</nav>
    <main>
      {q.length > 1 ? <div className="card"><h2>Search results for “{q}”</h2>{hits.length === 0 && <p>No supporting passage found: evidence insufficient in loaded knowledge base.</p>}
        {hits.map((h, i) => <div key={i} className="flag"><span className="tag">{h.kind}</span> <b>{h.title}</b><br />{h.text}<br /><span className="sub">{h.ref}</span></div>)}
        <button className="act" onClick={async () => { const r = await fetch('/api/ask', { method: 'POST', body: JSON.stringify({ q }) }); setAsk(await r.json()); }}>Ask (cited; AI optional)</button>
        {ask && <div className="flag">{ask.answer || 'AI unavailable or no answer; retrieval results above are shown.'} <span className="tag">{ask.mode}</span></div>}</div> : <>

      {tab === 0 && <div className="card"><h2>Patient assessment</h2><p className="sub">Empty fields stay “unknown” and are never read as normal. Do not enter identifiers.</p>
        <div className="grid">{F('age', 'Age (y)', 'number')}{Sel('sex', 'Sex', [['', 'Not entered'], ['M', 'Male'], ['F', 'Female']])}{F('height', 'Height (cm)', 'number')}{F('weight', 'Weight (kg)', 'number')}{F('waist', 'Waist (cm)', 'number')}{F('sbp', 'SBP', 'number')}{F('dbp', 'DBP', 'number')}</div>
        <div className="sub">BMI: {bm ? bm.toFixed(1) : 'not computed'}</div>
        <h3>History</h3><div className="grid">{Sel('ascvd', 'Clinical ASCVD (ACS/MI, stroke/TIA, PAD, revasc)', YN)}{Sel('diabetes', 'Diabetes', YN)}{Sel('htn', 'Hypertension', YN)}{Sel('ckd', 'CKD', YN)}{Sel('dialysis', 'Dialysis', YN)}{Sel('liver', 'Liver disease', YN)}{Sel('thyroid', 'Thyroid disease', YN)}{Sel('smoker', 'Tobacco', YN)}{Sel('alcohol', 'Alcohol excess', YN)}{Sel('adherence', 'Adherence confirmed', YN)}{Sel('famPremature', 'Family premature ASCVD', TRI)}{Sel('preg', 'Pregnancy / breastfeeding', [['unknown', 'Unknown'], ['no', 'Not pregnant / not planning'], ['planning', 'Planning'], ['pregnant', 'Pregnant'], ['breastfeeding', 'Breastfeeding']])}</div>
        <h3>Therapy</h3><div className="grid">{F('currentStatin', 'Statin & dose')}{Sel('onMaxStatin', 'On maximally tolerated statin', YN)}{Sel('onEze', 'On ezetimibe', YN)}{Sel('statinIntol', 'Suspected statin intolerance', YN)}{F('otherTx', 'Other lipid therapy / adverse effects')}</div>
        <h3>Laboratory</h3><div className="grid">{Sel('unit', 'Units (lipids)', [['mg/dL', 'mg/dL'], ['mmol/L', 'mmol/L']])}{F('labDate', 'Sample date', 'date')}{Sel('fasting', 'Fasting', YN)}{Sel('onTx', 'Measured on lipid treatment', YN)}{Sel('ldlMeasured', 'LDL-C is', [['unknown', 'Unknown'], ['direct', 'Directly measured'], ['calculated', 'Calculated']])}{F('tc', 'Total cholesterol', 'number')}{F('ldl', 'LDL-C', 'number')}{F('hdl', 'HDL-C', 'number')}{F('tg', 'Triglycerides', 'number')}{F('apob', 'ApoB (mg/dL; g/L×100 if mmol mode)', 'number')}{F('lpa', 'Lp(a) value', 'number')}{Sel('lpaUnit', 'Lp(a) unit (as reported)', [['mg/dL', 'mg/dL'], ['nmol/L', 'nmol/L']])}{F('baselineLdl', 'Pre-treatment LDL-C (baseline)', 'number')}{F('hba1c', 'HbA1c', 'number')}{F('egfr', 'eGFR', 'number')}{F('alt', 'ALT', 'number')}{F('tsh', 'TSH', 'number')}</div>
        <button className="sec" onClick={reset}>Reset assessment</button></div>}

      {tab === 1 && <div className="card"><h2>Lipid report interpretation</h2>
        <table><tbody><tr><th>Non-HDL-C</th><td>{nh === null ? 'needs TC and HDL-C' : `${Math.round(nh)} mg/dL (${round(fromMgdl(nh, 'mmol/L', 'chol'), 2)} mmol/L)`}</td></tr>
          <tr><th>Remnant-C (TC−LDL−HDL)</th><td>{rem === null ? 'n/a' : Math.round(rem) + ' mg/dL'}</td></tr>
          <tr><th>Friedewald LDL-C</th><td>{fw.value === null ? fw.reason : `${Math.round(fw.value)} mg/dL — ${fw.valid ? 'valid' : 'NOT VALID'}: ${fw.reason}`}</td></tr>
          <tr><th>Sampson LDL-C</th><td>{sa.value === null ? sa.reason : `${Math.round(sa.value)} mg/dL — ${sa.valid ? 'valid' : 'NOT VALID'}: ${sa.reason}`}</td></tr>
          <tr><th>Entered LDL-C source</th><td>{s.ldlMeasured}</td></tr>
          <tr><th>Reduction from baseline</th><td>{red === null ? 'needs baseline + current' : red.toFixed(0) + '% (measured)'}</td></tr></tbody></table>
        <h3>Flags</h3><Flags f={flags} />
        {(() => { const e = labs.onTreatment && red !== null ? responseCheck(red, 35) : null; return e ? <Flags f={[e]} /> : null; })()}
        <p className="sub">Response check uses the atorvastatin lower bound (35%) as a coarse reference; choose the actual drug range in Treatment planner.</p></div>}

      {tab === 2 && <div className="card"><h2>Cardiovascular risk and treatment targets</h2>
        <div className="grid">{Sel('pathway', 'Guideline framework', Object.entries(PATHWAY_LABEL))}{Sel('cat', 'Risk category (clinician-selected)', [['', 'Select…'], ...cats.map((c) => [c.id, c.label])])}</div>
        <div className="flag">{gate.message}</div>
        {cat ? <table><tbody><tr><th>LDL-C goal</th><td>&lt;{cat.ldl} mg/dL ({round(fromMgdl(cat.ldl, 'mmol/L', 'chol'), 1)} mmol/L)</td></tr><tr><th>Non-HDL-C</th><td>{cat.nonHdl ? '<' + cat.nonHdl + ' mg/dL' : 'not stated'}</td></tr><tr><th>ApoB</th><td>{cat.apoB ? '<' + cat.apoB + ' mg/dL' : 'not stated'}</td></tr><tr><th>% reduction goal</th><td>{cat.pctReduction ? '≥' + cat.pctReduction + '%' : 'not extracted/stated'}</td></tr><tr><th>Basis</th><td>{cat.basis} <span className="tag">{cat.verified}</span></td></tr><tr><th>Additional LDL-C reduction needed</th><td>{need === null ? 'needs current LDL-C' : need.toFixed(0) + '%'}</td></tr></tbody></table> : <p>Select a category.</p>}
        <p className="sub">Risk equations (PREVENT-ASCVD, SCORE2, PCE) are not re-implemented: coefficients could not be verified here. Use the official calculator and enter the resulting category. India: apply Western equations with caution — Indians develop ASCVD about a decade earlier (LAI).</p></div>}

      {tab === 3 && <div className="card"><h2>Treatment planner</h2>
        <Flags f={plan.warnings.map((w) => ({ level: 'warn', text: w }))} />
        {plan.gapPct !== null && <p>Required additional LDL-C reduction: <b>{plan.gapPct.toFixed(0)}%</b></p>}
        {plan.steps.map((p, i) => <div key={i} className="card"><b>Step {p.n}: {p.title}</b><br />{p.rationale}
          {p.drugs.map((d) => { const x = DRUGS[d]; return x && <div key={d} className="flag"><b>{x.name}</b> — {x.dose}<br />Expected LDL-C reduction: {x.expected ? `${x.expected[0]}-${x.expected[1]}%` : 'not stated in verified sources'} <span className="sub">({x.source})</span><br />Outcome evidence: {x.outcomeEvidence}<br />Precautions: {x.precautions}<br /><span className="tag">{x.availability}</span></div>; })}</div>)}
        {labs.ldl !== null && <p className="sub">Illustrative (not additive, not a prediction): ezetimibe + high-intensity statin from current LDL-C projects roughly {project(labs.ldl, ['ezetimibe']).map((v) => Math.round(v)).join('–')} mg/dL via ezetimibe alone; actual response must be measured.</p>}
        <h3>Lifestyle (editable in report)</h3><ul><li>Vegetarian: dals, legumes, whole grains/millets, nuts, soluble fibre (oats, isabgol), limit ghee/coconut-oil-heavy cooking and refined carbohydrate.</li><li>Egg-inclusive/non-vegetarian: grilled/steamed fish, limit red/processed meat and fried foods.</li><li>Replace trans-fat/saturated fat with mono/polyunsaturated oils; portion control; limit sugary drinks, sweets, alcohol (esp. high TG).</li><li>≥150 min/week moderate activity (high-intensity raises HDL particles in trials; textbook p.406); tobacco cessation; weight loss for TG.</li></ul>
        <h3>Indian brands</h3><p>{brands.note}</p></div>}

      {tab === 4 && <div className="card"><h2>Special populations and pathways</h2>{pathways.map((p) => <details key={p.id} className="card"><summary><b>{p.title}</b></summary><p><b>Missing information:</b> {p.missing}</p><p><b>Evaluation:</b> {p.evaluate}</p><p><b>Treatment considerations:</b> {p.consider}</p><p><b>Referral:</b> {p.refer}</p><p className="sub">Source: {p.src}. Items without textbook/guideline source are unverified.</p></details>)}</div>}

      {tab === 5 && <div className="card"><h2>Familial and inherited lipid disorders — DLCN score</h2>
        <p className="sub">Scoring rules verified (Nordestgaard 2013). Unknown ≠ absent; the result is a min–max range.</p>
        <div className="grid">{Sel('untreatedKnown', 'LDL-C below is UNTREATED?', YN)}{F('untreatedLdl', `Untreated LDL-C (${s.unit})`, 'number')}{Sel('famCHD', 'Relative premature CHD', TRI)}{Sel('famLdl95', 'Relative LDL-C >95th pct', TRI)}{Sel('famXA', 'Relative xanthoma/arcus', TRI)}{Sel('childLdl', 'Child <18 LDL-C >95th pct', TRI)}{Sel('premCAD', 'Patient premature CAD', TRI)}{Sel('premCV', 'Patient premature cerebral/PVD', TRI)}{Sel('xan', 'Tendon xanthoma', TRI)}{Sel('arcus', 'Arcus <45 y', TRI)}{Sel('dna', 'Causative variant (LDLR/APOB/PCSK9)', TRI)}</div>
        <h3>Score: {fh.min}{fh.max !== fh.min ? `–${fh.max}` : ''} → {fh.minCategory}{fh.minCategory !== fh.maxCategory ? ` to ${fh.maxCategory}` : ''}</h3>
        <table><thead><tr><th>Group</th><th>Min</th><th>Max</th></tr></thead><tbody>{fh.groupBreakdown.map((g) => <tr key={g.group}><td>{g.group}</td><td>{g.min}</td><td>{g.max}</td></tr>)}</tbody></table>
        <table><thead><tr><th>Criterion</th><th>Points</th><th>Status</th></tr></thead><tbody>{fh.criteria.map((c) => <tr key={c.label}><td>{c.label}</td><td>{c.points}</td><td>{c.status}</td></tr>)}</tbody></table>
        <Flags f={fh.notes.map((n) => ({ level: 'info', text: n }))} />
        <p className="sub">Cascade screening: first-degree relatives 50% chance of variant, second 25%, third 12.5% (textbook p.370). Genetic testing may support diagnosis; negative result does not exclude FH. Other inherited disorders: see Knowledge bank (Table 10-7).</p></div>}

      {tab === 6 && <div className="card"><h2>Knowledge bank (textbook Ch.10, summarised in original wording)</h2>
        {knowledge.map((k) => <details key={k.id} className="card"><summary><b>{k.title}</b> <span className="tag">p.{k.pages}</span></summary><p>{k.summary}</p><p className="sub">Textbook content; may predate current guidelines.</p></details>)}</div>}

      {tab === 7 && <div className="card"><h2>Guidelines comparison (separate, not merged)</h2>
        <table><thead><tr><th>Framework</th><th>Category</th><th>LDL-C</th><th>Non-HDL</th><th>ApoB</th><th>Basis</th></tr></thead><tbody>
          {(Object.keys(CATEGORIES) as Pathway[]).flatMap((p) => CATEGORIES[p].map((c) => <tr key={p + c.id}><td>{p.replace(/_/g, ' ')}</td><td>{c.label}</td><td>&lt;{c.ldl}</td><td>{c.nonHdl ?? '—'}</td><td>{c.apoB ?? '—'}</td><td>{c.basis} <span className="tag">{c.verified}</span></td></tr>))}</tbody></table>
        <h3>Key differences</h3><ul><li><b>ACC/AHA 2026</b> replaced the 2018 pooled-cohort approach with PREVENT-ASCVD, restored LDL-C goals (secondary prevention &lt;70; very high risk &lt;55) and recommends one-time Lp(a) testing in adults.</li><li><b>ESC/EAS</b> keeps ≥50% reduction plus absolute goals; all established ASCVD is very high risk; 2025 update adds bempedoic acid, earlier combination therapy and Lp(a)/hs-CRP as risk modifiers; adds an extreme-risk category (goal not verified here).</li><li><b>India (LAI/CSI)</b> sets lower goals (LAI &lt;50 very high; ≤30 extreme risk) and emphasises lifetime risk, subclinical atherosclerosis and CAC.</li><li>Textbook Table 10-15 reflects 2016–2019 documents.</li></ul></div>}

      {tab === 8 && <div className="card"><h2>Trials and evidence</h2><p className="sub">Outcome trials vs surrogate endpoints are labelled. “verify” notes show whether numbers were read from the textbook or recalled.</p>
        <table><thead><tr><th>Trial</th><th>Drug / marker</th><th>Population (n)</th><th>Result</th><th>NNT</th><th>Applicability / source</th></tr></thead><tbody>
          {trials.map((t) => <tr key={t.name}><td><b>{t.name}</b><br /><span className="tag">{t.effect}</span></td><td>{t.drug}<br />{t.marker}</td><td>{t.population} ({t.n ?? 'n/a'}); {t.design}; {t.followup}</td><td>{t.result}</td><td>{t.arr ? `${Math.round(100 / t.arr)} over ${t.arrYears} y (ARR ${t.arr}%)` : 'not calculated (no verified ARR)'}</td><td>{t.applicability}<br />{t.source}<br /><span className="sub">{t.verify}</span></td></tr>)}</tbody></table></div>}

      {tab === 9 && <div className="card"><h2>Follow-up and response tracking</h2><p className="sub">Stored only in this browser (localStorage). Explicit save/delete. Measured values vs projections are kept separate.</p>
        <FollowUp serial={serial} save={saveSerial} unit={unit} />
        {serial.length > 1 && cat && cat.ldl !== null && <Chart serial={serial} target={cat.ldl} />}</div>}

      {tab === 10 && <div className="card"><h2>Printable clinical report (editable)</h2><div className="noprint"><button className="act" onClick={buildReport}>Generate draft</button><button className="sec" onClick={() => window.print()}>Print / save PDF</button><button className="sec" onClick={() => { const b = new Blob([report], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'lipid-report.txt'; a.click(); }}>Download .txt</button></div>
        <textarea value={report} onChange={(e) => setReport(e.target.value)} placeholder="Click Generate draft, then edit." /></div>}
      </>}
    </main></>);
}

function FollowUp({ serial, save, unit }: { serial: Entry[]; save: (e: Entry[]) => void; unit: Unit }) {
  const [e, setE] = useState<Entry>({ date: '', ldl: '', tg: '', hdl: '', tc: '', therapy: '', adherence: '', adverse: '' });
  const f = (k: keyof Entry, l: string, t = 'text') => <label>{l}<input type={t} value={e[k]} onChange={(x) => setE({ ...e, [k]: x.target.value })} /></label>;
  return (<><div className="grid">{f('date', 'Date', 'date')}{f('ldl', `LDL-C (${unit})`, 'number')}{f('tc', 'TC', 'number')}{f('hdl', 'HDL-C', 'number')}{f('tg', 'TG', 'number')}{f('therapy', 'Therapy')}{f('adherence', 'Adherence')}{f('adverse', 'Adverse effects')}</div>
    <button className="act" onClick={() => { if (!e.date) return alert('Date required'); save([...serial, e].sort((a, b) => a.date.localeCompare(b.date))); }}>Save result</button>
    <button className="sec" onClick={() => { if (confirm('Delete ALL saved follow-up data from this browser?')) save([]); }}>Delete all</button>
    <table><thead><tr><th>Date</th><th>LDL</th><th>TC</th><th>HDL</th><th>TG</th><th>Therapy</th><th>Adh.</th><th>AE</th></tr></thead><tbody>{serial.map((r, i) => <tr key={i}><td>{r.date}</td><td>{r.ldl || '—'}</td><td>{r.tc || '—'}</td><td>{r.hdl || '—'}</td><td>{r.tg || '—'}</td><td>{r.therapy}</td><td>{r.adherence}</td><td>{r.adverse}</td></tr>)}</tbody></table></>);
}
function Chart({ serial, target }: { serial: Entry[]; target: number }) {
  const pts = serial.map((r) => num(r.ldl)).filter((v): v is number => v !== null);
  if (pts.length < 2) return null;
  const max = Math.max(...pts, target) * 1.1; const W = 320, H = 120;
  const x = (i: number) => 10 + (i * (W - 20)) / (pts.length - 1), y = (v: number) => H - 10 - (v / max) * (H - 20);
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="LDL-C trend (measured values)"><line x1="10" x2={W - 10} y1={y(target)} y2={y(target)} stroke="currentColor" strokeDasharray="4" /><polyline fill="none" stroke="#0b6e99" strokeWidth="2" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')} /><text x="12" y={y(target) - 3} fontSize="9" fill="currentColor">goal (mg/dL entered; chart assumes same unit as goal)</text></svg>;
}
