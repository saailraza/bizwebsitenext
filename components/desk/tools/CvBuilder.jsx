'use client';
import { useEffect, useMemo, useState } from 'react';
import { cvModel, cvChecks, CV_KEY } from '@/lib/cv';

const COLORS = [['Green', '#1d5c3d'], ['Navy', '#1f3a5f'], ['Charcoal', '#333333'], ['Maroon', '#7a2230']];
const exp0 = () => ({ role: '', company: '', from: '', to: '', details: '' });
const edu0 = () => ({ degree: '', school: '', year: '', grade: '' });
const start = () => ({ name: '', title: '', email: '', phone: '', city: '', links: '', photo: '', summary: '', exp: [exp0()], edu: [edu0()], skills: '', languages: '', certs: '', personal: '' });

export default function CvBuilder() {
  const [d, setD] = useState(start);
  const [layout, setLayout] = useState('classic');
  const [color, setColor] = useState(COLORS[0][1]);
  const [msg, setMsg] = useState('');
  const m = useMemo(() => cvModel(d), [d]);
  const checks = useMemo(() => cvChecks(m), [m]);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  const chList = (k, i, f, v) => setD((x) => ({ ...x, [k]: x[k].map((r, j) => (j === i ? { ...r, [f]: v } : r)) }));
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved(!!localStorage.getItem(CV_KEY)); } catch { /* storage may be blocked */ }
  }, []);

  function photo(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setMsg('Choose a JPG, PNG or WebP photo.');
    if (f.size > 2 * 1024 * 1024) return setMsg('That photo is over 2 MB. Choose a smaller one.');
    const r = new FileReader();
    r.onload = () => { setD((x) => ({ ...x, photo: String(r.result) })); setMsg(''); };
    r.readAsDataURL(f);
  }
  function save() {
    try {
      const { photo: _p, ...rest } = d;
      localStorage.setItem(CV_KEY, JSON.stringify({ d: rest, layout, color }));
      setSaved(true); setMsg('Saved in this browser only (without the photo).');
    } catch { setMsg('This browser would not let us save. Print or download instead.'); }
  }
  function load() {
    try {
      const j = JSON.parse(localStorage.getItem(CV_KEY) || 'null');
      if (!j || !j.d) return setMsg('Nothing saved in this browser yet.');
      setD({ ...start(), ...j.d, exp: j.d.exp && j.d.exp.length ? j.d.exp : [exp0()], edu: j.d.edu && j.d.edu.length ? j.d.edu : [edu0()] });
      if (j.layout) setLayout(j.layout);
      if (COLORS.some((c) => c[1] === j.color)) setColor(j.color);
      setMsg('Loaded your saved CV.');
    } catch { setMsg('Could not read the saved CV.'); }
  }
  function wipe() {
    try { localStorage.removeItem(CV_KEY); } catch { /* ignore */ }
    setSaved(false); setMsg('Saved copy removed from this browser.');
  }
  const contact = [m.email, m.phone, m.city, ...m.links].filter(Boolean);

  const Section = ({ title, children }) => (
    <section className="cv-sec">
      <h3>{title}</h3>
      {children}
    </section>
  );
  const Side = () => (
    <>
      {m.skills.length > 0 && (
        <Section title="Skills">
          <ul className="cv-tags">{m.skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}
      {m.languages.length > 0 && (
        <Section title="Languages">
          <ul className="cv-tags">{m.languages.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}
      {m.certs.length > 0 && (
        <Section title="Certifications">
          <ul className="cv-list">{m.certs.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}
      {m.personal.length > 0 && (
        <Section title="Personal details">
          <dl className="cv-pd">{m.personal.map(([k, v], i) => <div key={i}>{k && <dt>{k}</dt>}<dd>{v}</dd></div>)}</dl>
        </Section>
      )}
    </>
  );
  const Main = () => (
    <>
      {m.summary && <Section title="Profile"><p>{m.summary}</p></Section>}
      {m.exp.length > 0 && (
        <Section title="Experience">
          {m.exp.map((e, i) => (
            <div className="cv-item" key={i}>
              <div className="cv-hd"><b>{e.role}</b>{(e.from || e.to) && <span>{[e.from, e.to].filter(Boolean).join(' - ')}</span>}</div>
              {e.company && <div className="cv-sub">{e.company}</div>}
              {e.bullets.length > 0 && <ul className="cv-list">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </Section>
      )}
      {m.edu.length > 0 && (
        <Section title="Education">
          {m.edu.map((e, i) => (
            <div className="cv-item" key={i}>
              <div className="cv-hd"><b>{e.degree}</b>{e.year && <span>{e.year}</span>}</div>
              {(e.school || e.grade) && <div className="cv-sub">{[e.school, e.grade].filter(Boolean).join(' | ')}</div>}
            </div>
          ))}
        </Section>
      )}
    </>
  );

  return (
    <div className="dk-tool">
      <div className="dk-noprint">
        <p className="dk-fine">Everything you type stays in your browser. Use one line per point in the lists. Press "Print or save as PDF" when you are done and choose "Save as PDF". Turn off "Headers and footers" in the print window.</p>
        <fieldset className="dk-fs">
          <legend>About you</legend>
          <div className="dk-row">
            <label>Full name<input value={d.name} maxLength={80} onChange={set('name')} /></label>
            <label>Job title you want<input value={d.title} maxLength={80} onChange={set('title')} /></label>
            <label>Email<input type="email" value={d.email} maxLength={80} onChange={set('email')} /></label>
            <label>Phone<input value={d.phone} maxLength={30} onChange={set('phone')} /></label>
            <label>City and country<input value={d.city} maxLength={60} onChange={set('city')} /></label>
            <label>Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} /></label>
            <label className="dk-wide">Links, one per line (LinkedIn, portfolio)<textarea rows={2} value={d.links} onChange={set('links')} /></label>
            <label className="dk-wide">Profile: two or three sentences on who you are and what you want<textarea rows={3} value={d.summary} onChange={set('summary')} /></label>
          </div>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Experience, latest first</legend>
          {d.exp.map((e, i) => (
            <div className="cv-form-item" key={i}>
              <div className="dk-row">
                <label>Job title<input aria-label={`Job title ${i + 1}`} value={e.role} onChange={(x) => chList('exp', i, 'role', x.target.value)} /></label>
                <label>Company<input aria-label={`Company ${i + 1}`} value={e.company} onChange={(x) => chList('exp', i, 'company', x.target.value)} /></label>
                <label>From<input aria-label={`From ${i + 1}`} placeholder="Jan 2022" value={e.from} onChange={(x) => chList('exp', i, 'from', x.target.value)} /></label>
                <label>To<input aria-label={`To ${i + 1}`} placeholder="Present" value={e.to} onChange={(x) => chList('exp', i, 'to', x.target.value)} /></label>
                <label className="dk-wide">What you did, one achievement per line<textarea aria-label={`Details ${i + 1}`} rows={3} value={e.details} onChange={(x) => chList('exp', i, 'details', x.target.value)} /></label>
              </div>
              <button type="button" className="btn o" disabled={d.exp.length === 1} onClick={() => setD((x) => ({ ...x, exp: x.exp.filter((_, j) => j !== i) }))}>Remove this job</button>
            </div>
          ))}
          <button type="button" className="btn o" disabled={d.exp.length >= 8} onClick={() => setD((x) => ({ ...x, exp: [...x.exp, exp0()] }))}>Add a job</button>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Education</legend>
          {d.edu.map((e, i) => (
            <div className="cv-form-item" key={i}>
              <div className="dk-row">
                <label>Degree or certificate<input aria-label={`Degree ${i + 1}`} value={e.degree} onChange={(x) => chList('edu', i, 'degree', x.target.value)} /></label>
                <label>School or university<input aria-label={`School ${i + 1}`} value={e.school} onChange={(x) => chList('edu', i, 'school', x.target.value)} /></label>
                <label>Year<input aria-label={`Year ${i + 1}`} value={e.year} onChange={(x) => chList('edu', i, 'year', x.target.value)} /></label>
                <label>Result (optional)<input aria-label={`Result ${i + 1}`} value={e.grade} onChange={(x) => chList('edu', i, 'grade', x.target.value)} /></label>
              </div>
              <button type="button" className="btn o" disabled={d.edu.length === 1} onClick={() => setD((x) => ({ ...x, edu: x.edu.filter((_, j) => j !== i) }))}>Remove this entry</button>
            </div>
          ))}
          <button type="button" className="btn o" disabled={d.edu.length >= 6} onClick={() => setD((x) => ({ ...x, edu: [...x.edu, edu0()] }))}>Add education</button>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>More</legend>
          <div className="dk-row">
            <label className="dk-wide">Skills, separated by commas<textarea rows={2} value={d.skills} onChange={set('skills')} /></label>
            <label>Languages, separated by commas<textarea rows={2} value={d.languages} onChange={set('languages')} /></label>
            <label>Certifications, one per line<textarea rows={2} value={d.certs} onChange={set('certs')} /></label>
            <label className="dk-wide">Personal details (optional). Write each as "Label: value", one per line<textarea rows={2} placeholder="Nationality: Pakistani" value={d.personal} onChange={set('personal')} /></label>
          </div>
        </fieldset>
        <fieldset className="dk-fs">
          <legend>Look</legend>
          <div className="dk-row">
            <label>Layout<select value={layout} onChange={(e) => setLayout(e.target.value)}><option value="classic">Classic, one column</option><option value="side">Sidebar</option></select></label>
            <label>Colour<select value={color} onChange={(e) => setColor(e.target.value)}>{COLORS.map(([n, c]) => <option key={c} value={c}>{n}</option>)}</select></label>
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
          <button type="button" className="btn o" onClick={save}>Save in this browser</button>
          <button type="button" className="btn o" onClick={load} disabled={!saved}>Load saved CV</button>
          <button type="button" className="btn o" onClick={wipe} disabled={!saved}>Delete saved CV</button>
          <button type="button" className="btn o" onClick={() => { setD(start()); setMsg(''); }}>Clear form</button>
        </div>
        <p className="dk-fine" role="status">{msg}</p>
      </div>

      <div className={'dk-sheet cv cv-' + layout} style={{ '--cv': color }} id="dk-sheet" aria-label="CV preview">
        {layout === 'side' ? (
          <div className="cv-grid">
            <aside className="cv-side">
              {m.photo && <img className="cv-photo" src={m.photo} alt="" />}
              <h2>{m.name || 'Your name'}</h2>
              {m.title && <p className="cv-role">{m.title}</p>}
              {contact.length > 0 && <ul className="cv-contact">{contact.map((c, i) => <li key={i}>{c}</li>)}</ul>}
              <Side />
            </aside>
            <div className="cv-body"><Main /></div>
          </div>
        ) : (
          <>
            <div className="cv-head">
              {m.photo && <img className="cv-photo" src={m.photo} alt="" />}
              <div>
                <h2>{m.name || 'Your name'}</h2>
                {m.title && <p className="cv-role">{m.title}</p>}
                {contact.length > 0 && <p className="cv-line">{contact.join('  |  ')}</p>}
              </div>
            </div>
            <Main />
            <Side />
          </>
        )}
      </div>
    </div>
  );
}
