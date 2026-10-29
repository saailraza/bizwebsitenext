// Best-effort clean-up of article HTML typed in the admin panel (only signed-in admins can save).
// Removes scripts, frames, forms, inline event handlers and javascript: links.
export function cleanHtml(html) {
  let s = String(html || '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<\s*(script|style|iframe|object|embed|form|link|meta|base|noscript)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|link|meta|base|noscript)\b[^>]*>/gi, '');
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s(href|src|xlink:href|action|formaction)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, ' $1="#"');
  s = s.replace(/\s(href|src)\s*=\s*(javascript|vbscript|data):[^\s>]*/gi, ' $1="#"');
  return s.trim();
}
export function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
