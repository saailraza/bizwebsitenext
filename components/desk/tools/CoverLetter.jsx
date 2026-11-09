'use client';
import { useMemo, useState } from 'react';
import { coverLetter, coverChecks } from '@/lib/cv';

const today = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
export default function CoverLetter() {
  const [d, setD] = useState(() => ({ date: today() }));
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  const L = useMemo(() => coverLetter(d), [d]);
  const checks = useMemo(() => coverChecks(d), [d]);
  const I = (k, label, ph, extra = {}) => (
    <label>
      {label}
      <input value={d[k] || ''} placeholder={ph} maxLength={120} onChange={set(k)} {...extra} />
    </label>
  );
  const T = (k, label, ph) => (
    <label className="dk-wide">
      {label}
      <textarea rows={4} value={d[k] || ''} placeholder={ph} onChange={set(k)} />
    </label>
  );
  return (
    <div className="dk-tool">
      <div className="dk-noprint">
        <p className="dk-fine">Everything you type stays in your browser. The letter adds a short opening and closing. You write the middle in your own words, so it sounds like you.</p>
        <fieldset className="dk-fs">
          <legend>About you</legend>
          <div className="dk-row">
            {I('name', 'Your full name')}
            {I('email', 'Email', '', { type: 'email' })}
            {I('phone', 'Phone')}
            {I('address', 'Your city (optional)')}
            {I('date', 'Date', '', { type: 'date' })}
          </div>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>The job</legend>
          <div className="dk-row">
            {I('position', 'Job title you are applying for')}
            {I('company', 'Company name')}
            {I('rname', 'Who it goes to (optional)', 'Ms Sara Khan')}
            {I('rtitle', 'Their job title (optional)')}
            {I('raddr', 'Company address (optional)')}
            {I('source', 'Where you saw the job (optional)', 'Rozee.pk, LinkedIn')}
            {I('ref', 'Reference number (optional)')}
            {I('available', 'When you can start (optional)', 'immediately, or on 1 December 2026')}
          </div>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Your message</legend>
          <div className="dk-row">
            {T('why', 'Why this company and role', 'What attracts you to this company? Mention something specific about its work.')}
            {T('experience', 'Your most relevant experience', 'Say what you have done that matches the job. Use real results where you can.')}
            {T('strengths', 'Skills or strengths to add (optional)', 'One or two skills the advert asks for, with a short example.')}
          </div>
        </fieldset>
        {checks.length > 0 && (
          <div aria-live="polite" className="cv-checks">
            <b>Before you send it</b>
            <ul>{checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}
        <div className="dk-act">
          <button type="button" className="btn" onClick={() => window.print()}>Print or save as PDF</button>
          <button type="button" className="btn o" onClick={() => setD({ date: today() })}>Clear form</button>
        </div>
      </div>
      <div className="dk-sheet cl" id="dk-sheet" aria-label="Cover letter preview">
        {L.from.length > 0 && <p className="cl-from">{L.from.map((x, i) => <span key={i}>{x}<br /></span>)}</p>}
        {L.date && <p>{L.date}</p>}
        {L.to.length > 0 && <p>{L.to.map((x, i) => <span key={i}>{x}<br /></span>)}</p>}
        <p>{L.greeting}</p>
        {L.subject && <p><b>{L.subject}</b></p>}
        {L.paras.map((p, i) => <p key={i}>{p}</p>)}
        <p>{L.close}<br /><br />{L.name || '[Your name]'}</p>
      </div>
    </div>
  );
}
