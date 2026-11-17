import { NextResponse } from 'next/server';
import { search } from '@/lib/search';
// Retrieval-grounded Q&A. Works without AI (returns cited passages). The API key stays server-side.
// Do NOT send patient-identifiable data to this endpoint; nothing is logged here.
export async function POST(req: Request) {
  const { q } = await req.json().catch(() => ({ q: '' }));
  if (typeof q !== 'string' || !q.trim() || q.length > 500) return NextResponse.json({ error: 'invalid question' }, { status: 400 });
  const hits = search(q).slice(0, 6);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !hits.length) return NextResponse.json({ mode: 'retrieval-only', hits, answer: hits.length ? null : 'No supporting passage found: evidence insufficient in the loaded knowledge base.' });
  try {
    const ctx = hits.map((h, i) => `[${i + 1}] (${h.ref}) ${h.title}: ${h.text}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, system: 'Answer ONLY from the numbered passages, citing [n]. Do not give doses or recommendations not present in the passages. If insufficient, say so. Note textbook content may be older than current guidelines.', messages: [{ role: 'user', content: `Passages:\n${ctx}\n\nQuestion: ${q}` }] }) });
    const j = await r.json();
    const answer = j?.content?.map((c: { text?: string }) => c.text || '').join('') || null;
    return NextResponse.json({ mode: answer ? 'ai' : 'retrieval-only', answer, hits });
  } catch { return NextResponse.json({ mode: 'retrieval-only', hits, answer: null }); }
}
