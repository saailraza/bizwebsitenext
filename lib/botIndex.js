// Turns a blog body (HTML) into [heading, text] sections for BIZBOT's search index.
function text(h) {
  return h
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
export function botSections(body) {
  const parts = String(body || '').split(/<h2[^>]*>/i);
  const out = [];
  parts.forEach((p, i) => {
    if (i === 0) {
      const t = text(p);
      if (t) out.push(['Overview', t]);
      return;
    }
    const k = p.indexOf('</h2>');
    if (k < 0) return;
    const head = text(p.slice(0, k));
    const t = text(p.slice(k + 5));
    if (head && t) out.push([head, t]);
  });
  return out;
}
