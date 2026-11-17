import knowledge from '@/data/knowledge.json';
import trials from '@/data/trials.json';
import sources from '@/data/sources.json';
const ABBR: Record<string, string> = { fh: 'familial hypercholesterolemia', lpa: 'lipoprotein(a)', 'lp(a)': 'lipoprotein(a)', ldl: 'low-density lipoprotein', hdl: 'high-density lipoprotein', tg: 'triglycerides', fcs: 'familial chylomicronemia', ascvd: 'atherosclerotic cardiovascular disease', pcsk9: 'proprotein convertase', dlcn: 'dutch lipid clinic network', ipe: 'icosapent ethyl' };
export interface Hit { kind: 'Textbook' | 'Trial' | 'Source'; title: string; ref: string; text: string; score: number }
export function search(q: string): Hit[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean).flatMap((t) => (ABBR[t] ? [t, ...ABBR[t].split(' ')] : [t]));
  if (!terms.length) return [];
  const score = (s: string) => terms.reduce((a, t) => a + (s.toLowerCase().includes(t) ? 1 : 0), 0);
  const hits: Hit[] = [];
  for (const k of knowledge) { const sc = score(`${k.title} ${k.tags} ${k.summary}`) + (score(k.title) * 2); if (sc) hits.push({ kind: 'Textbook', title: k.title, ref: `Textbook p.${k.pages}`, text: k.summary, score: sc }); }
  for (const t of trials) { const sc = score(JSON.stringify(t)) + (q.toLowerCase().includes(t.name.toLowerCase()) ? 5 : 0); if (sc) hits.push({ kind: 'Trial', title: t.name, ref: t.source, text: `${t.drug}; n=${t.n ?? 'n/a'}; ${t.result}`, score: sc }); }
  for (const s of sources) { const sc = score(`${s.title} ${s.org}`); if (sc) hits.push({ kind: 'Source', title: s.title, ref: `${s.org} (${s.year})`, text: s.status, score: sc }); }
  return hits.sort((a, b) => b.score - a.score).slice(0, 15);
}
