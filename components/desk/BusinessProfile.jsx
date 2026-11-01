'use client';
import { useEffect, useState } from 'react';
import { loadProfile, saveProfile, clearProfile, imageToDataUrl, EMPTY_PROFILE } from '@/lib/businessProfile';

// Form for the business details that document tools print on every document.
// onChange(profile) fires whenever the saved profile changes.
export default function BusinessProfile({ onChange }) {
  const [p, setP] = useState(EMPTY_PROFILE);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const v = loadProfile();
    setP(v);
    onChange && onChange(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(k, v) {
    setP((o) => ({ ...o, [k]: v }));
    setMsg('');
  }
  async function pick(k, file) {
    try {
      set(k, await imageToDataUrl(file));
    } catch (e) {
      setMsg(e.message);
    }
  }
  function save() {
    const ok = saveProfile(p);
    setMsg(ok ? 'Saved in this browser only.' : 'Could not save. Your browser may be blocking storage.');
    onChange && onChange(p);
  }
  function wipe() {
    clearProfile();
    setP(EMPTY_PROFILE);
    onChange && onChange(EMPTY_PROFILE);
    setMsg('Profile removed from this browser.');
  }

  const text = [
    ['name', 'Business name'],
    ['ntn', 'NTN'],
    ['strn', 'STRN'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['address', 'Address'],
  ];
  const imgs = [
    ['logo', 'Logo'],
    ['signature', 'Signature'],
    ['stamp', 'Stamp'],
  ];
  return (
    <details className="dk-prof">
      <summary>My business profile (logo, NTN, signature)</summary>
      <p className="dk-fine">Saved only in this browser. It is never uploaded to BIZEASE.</p>
      <div className="dk-row">
        {text.map(([k, l]) => (
          <label key={k}>
            {l}
            <input value={p[k]} maxLength={160} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </div>
      <div className="dk-row">
        {imgs.map(([k, l]) => (
          <label key={k}>
            {l}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files[0] && pick(k, e.target.files[0])} />
            {p[k] ? (
              <span className="dk-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p[k]} alt={l + ' preview'} />
                <button type="button" onClick={() => set(k, '')}>
                  Remove
                </button>
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <div className="dk-act">
        <button type="button" className="btn" onClick={save}>
          Save profile
        </button>
        <button type="button" className="btn o" onClick={wipe}>
          Clear profile
        </button>
        <span role="status">{msg}</span>
      </div>
    </details>
  );
}
