import { IC } from '@/lib/icons';

export default function Icon({ n, s = 22 }) {
  const svg = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || IC.check}</svg>`;
  return <i style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
