'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

async function api(method, url, body) {
  // the site uses addresses with a trailing slash; asking for it directly avoids a redirect on every call
  if (!url.endsWith('/')) url += '/';
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

const today = () => new Date().toISOString().slice(0, 10);
const slugify = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

export default function AdminApp() {
  const [auth, setAuth] = useState('loading'); // loading | out | in
  const [storage, setStorage] = useState('');
  const [setupError, setSetupError] = useState('');
  const [tab, setTab] = useState('blog');
  const [toast, setToast] = useState(null);

  // stable, so a tab does not reload (and lose unsaved edits) every time a message appears
  const signedOut = useCallback(() => setAuth('out'), []);
  const say = useCallback((text, bad) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), bad ? 6000 : 3500);
  }, []);

  const check = useCallback(async () => {
    try {
      const s = await api('GET', '/api/admin/status');
      setStorage(s.storage);
      setAuth('in');
    } catch (e) {
      if (e.status === 503) setSetupError(e.message);
      setAuth('out');
    }
  }, []);
  useEffect(() => {
    check();
  }, [check]);

  async function logout() {
    try {
      await api('POST', '/api/admin/logout');
    } catch (e) {}
    setAuth('out');
  }

  if (auth === 'loading') return <div className="adm-main">Loading…</div>;
  if (auth === 'out') return <Login onDone={check} setupError={setupError} />;

  return (
    <>
      <div className="adm-top">
        <div className="in">
          <b>BIZEASE ADMIN</b>
          <span className="tag">{storage === 'github' ? 'Saves to GitHub' : storage === 'local' ? 'Local test mode' : 'Saving not set up'}</span>
          <span className="sp" />
          <a href="/" target="_blank" rel="noopener" style={{ color: '#cfe3d5' }}>
            View website
          </a>
          <button className="btn sm ln" style={{ color: '#fff', borderColor: '#ffffff80' }} onClick={logout}>
            Sign out
          </button>
        </div>
        <div className="adm-tabs" role="tablist">
          {[
            ['blog', 'Blog posts'],
            ['jobs', 'Jobs'],
            ['apps', 'Applications'],
            ['bot', 'BIZBOT'],
            ['tools', 'Desk tools'],
            ['rates', 'Rates and dates'],
            ['help', 'Help'],
          ].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-main">
        {tab === 'blog' && <BlogTab say={say} onAuth={signedOut} />}
        {tab === 'jobs' && <JobsTab say={say} onAuth={signedOut} />}
        {tab === 'apps' && <AppsTab say={say} onAuth={signedOut} />}
        {tab === 'bot' && <BotTab say={say} onAuth={signedOut} />}
        {tab === 'tools' && <ToolsTab say={say} onAuth={signedOut} />}
        {tab === 'rates' && <RatesTab say={say} onAuth={signedOut} />}
        {tab === 'help' && <Help storage={storage} />}
      </div>
      {toast && <div className={'toast' + (toast.bad ? ' bad' : '')} role="status">{toast.text}</div>}
    </>
  );
}

function Login({ onDone, setupError }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('POST', '/api/admin/login', { password: pw });
      setPw('');
      await onDone();
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }
  return (
    <div className="login">
      <form className="adm-card" onSubmit={submit}>
        <h1 style={{ fontSize: '1.6rem' }}>Admin sign in</h1>
        <p className="sub">BIZEASE SOLUTIONS website</p>
        {setupError && <div className="msg bad">{setupError}</div>}
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <div className="msg bad">{err}</div>}
        <div className="bar">
          <button className="btn dk" disabled={busy || !pw}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

// handles "session expired" for every tab
function useGuard(onAuth, say) {
  return useCallback(
    (e) => {
      if (e.status === 401) {
        onAuth();
        return;
      }
      say(e.message, true);
    },
    [onAuth, say]
  );
}

/* ---------------------------------------------------------------- blog */
function BlogTab({ say, onAuth }) {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // {slug,isNew} | null
  const fail = useGuard(onAuth, say);

  const load = useCallback(async () => {
    try {
      setItems((await api('GET', '/api/admin/blog')).items);
    } catch (e) {
      fail(e);
    }
  }, [fail]);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(it) {
    if (!window.confirm(`Delete "${it.title}"? This cannot be undone.`)) return;
    try {
      await api('DELETE', '/api/admin/blog/' + it.slug);
      say('Deleted. The website updates in about a minute.');
      load();
    } catch (e) {
      fail(e);
    }
  }

  if (edit)
    return (
      <PostEditor
        key={edit.slug || 'new'}
        slug={edit.slug}
        say={say}
        fail={fail}
        onClose={(changed) => {
          setEdit(null);
          if (changed) load();
        }}
      />
    );

  return (
    <div className="adm-card">
      <h2>Blog posts</h2>
      <p className="sub">Add, change or remove articles. The website updates about a minute after you save.</p>
      <button className="btn dk" onClick={() => setEdit({ slug: '' })}>
        + New post
      </button>
      {items === null ? (
        <p>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.slug}>
                  <td>
                    <span className="t">{it.title}</span>
                    <div style={{ color: 'var(--mute)', fontSize: '.8rem' }}>/blog/{it.slug}/</div>
                  </td>
                  <td>{it.category}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{it.date}</td>
                  <td>{it.published ? <span className="pill">Published</span> : <span className="pill off">Hidden</span>}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className="btn sm ln" onClick={() => setEdit({ slug: it.slug })}>
                      Edit
                    </button>{' '}
                    <button className="btn sm bad" onClick={() => remove(it)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5}>No posts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const EMPTY = { title: '', slug: '', category: '', date: today(), description: '', lead: '', body: '', tags: '', related: [], published: true };

function PostEditor({ slug, say, fail, onClose }) {
  const isNew = !slug;
  const [p, setP] = useState(isNew ? EMPTY : null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [services, setServices] = useState([]);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState([]);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!isNew) setP(await api('GET', '/api/admin/blog/' + slug));
        setServices((await api('GET', '/api/admin/landing')).items);
        setCats([...new Set((await api('GET', '/api/admin/blog')).items.map((i) => i.category))]);
      } catch (e) {
        fail(e);
      }
    })();
  }, [isNew, slug, fail]);

  if (!p) return <div className="adm-card">Loading…</div>;
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setErrs([]);
    const useSlug = isNew ? p.slug || slugify(p.title) : slug;
    if (!useSlug) {
      setErrs(['Title is required. The web address is made from it.']);
      setBusy(false);
      return;
    }
    try {
      await api('PUT', '/api/admin/blog/' + useSlug, { ...p, isNew });
      say('Saved. The website updates in about a minute.');
      onClose(true);
    } catch (e) {
      if (e.status === 400 || e.status === 409) setErrs(e.message.split(/(?<=\.)\s+/));
      fail(e);
    }
    setBusy(false);
  }

  const relSel = new Set((p.related || []).map((r) => r.href));
  function toggleRel(s) {
    set('related', relSel.has(s.href) ? p.related.filter((r) => r.href !== s.href) : [...(p.related || []), s].slice(0, 6));
  }

  return (
    <div className="adm-card">
      <h2>{isNew ? 'New blog post' : 'Edit blog post'}</h2>
      <p className="sub">Fields marked * are required.</p>

      <label htmlFor="t">Title *</label>
      <input
        id="t"
        type="text"
        maxLength={200}
        value={p.title}
        onChange={(e) => {
          set('title', e.target.value);
          if (isNew && !slugTouched) set('slug', slugify(e.target.value));
        }}
      />

      <div className="row">
        <div>
          <label htmlFor="s">
            Web address * <small>/blog/…/</small>
          </label>
          <input
            id="s"
            type="text"
            value={isNew ? p.slug : slug}
            disabled={!isNew}
            onChange={(e) => {
              setSlugTouched(true);
              set('slug', slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <label htmlFor="d">Date *</label>
          <input id="d" type="date" value={p.date} onChange={(e) => set('date', e.target.value)} />
        </div>
      </div>

      <label htmlFor="c">Category *</label>
      <input id="c" type="text" list="cats" maxLength={60} value={p.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Pakistan Taxation" />
      <datalist id="cats">
        {cats.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label htmlFor="ds">
        Short description for Google * <span className={'count' + (p.description.length > 160 ? ' over' : '')}>{p.description.length}/160</span>
      </label>
      <textarea id="ds" rows={2} maxLength={320} value={p.description} onChange={(e) => set('description', e.target.value)} />

      <label htmlFor="l">
        Opening paragraph <small>(shown in larger text at the top; leave empty to reuse the description)</small>
      </label>
      <textarea id="l" rows={3} value={p.lead} onChange={(e) => set('lead', e.target.value)} />

      <label>Article *</label>
      <RichEditor value={p.body} onChange={(v) => set('body', v)} />

      <label htmlFor="tg">
        Hashtags <small>(separate with spaces, e.g. #FBR #NTN)</small>
      </label>
      <input id="tg" type="text" value={p.tags} onChange={(e) => set('tags', e.target.value)} />

      {services.length > 0 && (
        <>
          <label>Related services shown under the article</label>
          {services.map((s) => (
            <label className="chk" key={s.href}>
              <input type="checkbox" checked={relSel.has(s.href)} onChange={() => toggleRel(s)} />
              <span>
                {s.title} <small>{s.href}</small>
              </span>
            </label>
          ))}
        </>
      )}

      <label className="chk" style={{ marginTop: 16 }}>
        <input type="checkbox" checked={p.published !== false} onChange={(e) => set('published', e.target.checked)} />
        <span>Published (untick to hide this post from the website)</span>
      </label>

      {errs.length > 0 && (
        <div className="msg bad">
          {errs.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <div className="bar">
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn ln" onClick={() => setPreview(true)}>
          Preview
        </button>
        <button className="btn ln" onClick={() => onClose(false)}>
          Cancel
        </button>
      </div>

      {preview && (
        <div className="modal" onClick={() => setPreview(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <p style={{ color: 'var(--mute)', margin: 0 }}>
              {p.category} · {p.date}
            </p>
            <h1>{p.title || 'Title'}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--mute)' }} dangerouslySetInnerHTML={{ __html: p.lead || p.description }} />
            <div className="ed" style={{ border: 0, padding: 0, maxHeight: 'none' }} dangerouslySetInnerHTML={{ __html: p.body }} />
            <div className="bar">
              <button className="btn dk" onClick={() => setPreview(false)}>
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  const [html, setHtml] = useState(false);
  const last = useRef(null);

  // put the saved text in the editor once (and when switching back from the HTML view)
  useEffect(() => {
    if (!html && ref.current && last.current !== value) {
      ref.current.innerHTML = value || '';
      last.current = value;
    }
  }, [html, value]);

  function sync() {
    const v = ref.current.innerHTML;
    last.current = v;
    onChange(v);
  }
  function cmd(c, arg) {
    ref.current.focus();
    document.execCommand(c, false, arg);
    sync();
  }
  function link() {
    const url = window.prompt('Link address (https://… or /contact/)');
    if (url) cmd('createLink', url);
  }
  const B = ({ c, a, children, title, onClick }) => (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick || (() => cmd(c, a))}>
      {children}
    </button>
  );
  return (
    <div>
      <div className="tb">
        {!html && (
          <>
            <B c="formatBlock" a="h2" title="Heading">H2</B>
            <B c="formatBlock" a="h3" title="Sub-heading">H3</B>
            <B c="formatBlock" a="p" title="Normal text">Text</B>
            <B c="bold" title="Bold"><b>B</b></B>
            <B c="italic" title="Italic"><i>I</i></B>
            <B c="insertUnorderedList" title="Bullet list">• List</B>
            <B c="insertOrderedList" title="Numbered list">1. List</B>
            <B title="Add link" onClick={link}>Link</B>
            <B c="removeFormat" title="Clear formatting">Clear</B>
          </>
        )}
        <span className="sep" />
        <button type="button" className={html ? 'on' : ''} onClick={() => setHtml((h) => !h)}>
          {html ? 'Back to visual' : 'HTML'}
        </button>
      </div>
      {html ? (
        <textarea className="src" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      ) : (
        <div ref={ref} className="ed" contentEditable suppressContentEditableWarning onInput={sync} onBlur={sync} role="textbox" aria-multiline="true" aria-label="Article" />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- jobs */
function JobsTab({ say, onAuth }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useGuard(onAuth, say);
  useEffect(() => {
    (async () => {
      try {
        setItems((await api('GET', '/api/admin/jobs')).items || []);
      } catch (e) {
        fail(e);
      }
    })();
  }, [fail]);
  if (!items) return <div className="adm-card">Loading…</div>;
  const upd = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i, d) => {
    const a = [...items];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setItems(a);
  };
  async function save() {
    setBusy(true);
    try {
      await api('PUT', '/api/admin/jobs', { items });
      say('Saved. The Careers page updates in about a minute.');
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }
  return (
    <div className="adm-card">
      <h2>Jobs</h2>
      <p className="sub">These appear on the Careers page and in the &quot;Position applying for&quot; list of the application form.</p>
      {items.map((j, i) => (
        <div className="jobrow" key={i}>
          <div className="row">
            <div>
              <label htmlFor={'jt' + i}>Job title *</label>
              <input id={'jt' + i} type="text" value={j.title} onChange={(e) => upd(i, 'title', e.target.value)} />
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div>
                <label htmlFor={'jy' + i}>Type</label>
                <input id={'jy' + i} type="text" value={j.type || ''} onChange={(e) => upd(i, 'type', e.target.value)} placeholder="Full-time" />
              </div>
              <div>
                <label htmlFor={'jl' + i}>Location</label>
                <input id={'jl' + i} type="text" value={j.location || ''} onChange={(e) => upd(i, 'location', e.target.value)} placeholder="Islamabad" />
              </div>
            </div>
          </div>
          <label htmlFor={'js' + i}>Short description</label>
          <textarea id={'js' + i} rows={2} value={j.summary || ''} onChange={(e) => upd(i, 'summary', e.target.value)} />
          <div className="bar" style={{ marginTop: 10 }}>
            <label className="chk" style={{ margin: 0 }}>
              <input type="checkbox" checked={j.active !== false} onChange={(e) => upd(i, 'active', e.target.checked)} />
              <span>Open for applications</span>
            </label>
            <span style={{ flex: 1 }} />
            <button className="btn sm ln" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button className="btn sm ln" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button className="btn sm bad" onClick={() => setItems(items.filter((_, k) => k !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <div className="bar">
        <button className="btn ln" onClick={() => setItems([...items, { title: '', type: 'Full-time', location: 'Islamabad', summary: '', active: true }])}>
          + Add a job
        </button>
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save jobs'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- apps */
function AppsTab({ say, onAuth }) {
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useGuard(onAuth, say);
  useEffect(() => {
    (async () => {
      try {
        setV(await api('GET', '/api/admin/apps'));
      } catch (e) {
        fail(e);
      }
    })();
  }, [fail]);
  if (!v) return <div className="adm-card">Loading…</div>;
  async function save() {
    setBusy(true);
    try {
      await api('PUT', '/api/admin/apps', v);
      say('Saved. The Applications page updates in about a minute.');
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }
  return (
    <div className="adm-card">
      <h2>Application links</h2>
      <p className="sub">Paste the web address of each application. While a box is empty, the page shows &quot;Link coming soon&quot;.</p>
      {[
        ['bizloan', 'BIZLOAN ERP'],
        ['bizbook', 'BIZBOOK'],
        ['bizkhata', 'BIZKHATA'],
      ].map(([k, l]) => (
        <div key={k}>
          <label htmlFor={'a' + k}>{l}</label>
          <input id={'a' + k} type="url" placeholder="https://" value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        </div>
      ))}
      <div className="bar">
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save links'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- bizbot */
function BotTab({ say, onAuth }) {
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useGuard(onAuth, say);
  useEffect(() => {
    (async () => {
      try {
        setV(await api('GET', '/api/admin/bizbot'));
      } catch (e) {
        fail(e);
      }
    })();
  }, [fail]);
  if (!v) return <div className="adm-card">Loading…</div>;
  async function save() {
    setBusy(true);
    try {
      await api('PUT', '/api/admin/bizbot', v);
      say('Saved. The change goes live in about a minute.');
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }
  return (
    <div className="adm-card">
      <h2>BIZBOT AI</h2>
      <p className="sub">BIZBOT always answers from the website&apos;s own content. When AI is on, questions it cannot answer are sent to your AI server.</p>
      <label className="chk">
        <input type="checkbox" checked={!!v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} />
        <span>Turn AI answers on</span>
      </label>
      <label htmlFor="bapi">AI server address</label>
      <input id="bapi" type="url" placeholder="https://api.your-domain.com/v1/chat" value={v.api || ''} onChange={(e) => setV({ ...v, api: e.target.value })} />
      <p className="sub" style={{ marginTop: 8 }}>
        Turn this on only after the Python backend is deployed and has its AI key. API keys are never entered here.
      </p>
      <div className="bar">
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- help */
function Help({ storage }) {
  return (
    <div className="adm-card help">
      <h2>How this panel works</h2>
      <ul>
        <li>
          Every save is stored in your GitHub repository. Vercel notices the change and rebuilds the website, so changes appear about <b>one minute</b> after you press Save.
        </li>
        <li>Blog posts, jobs, application links, BIZBOT settings, the wording of BIZEASE DESK tool pages, and the sales tax rate and compliance dates can be changed here. Tool calculations and design are changed in the code.</li>
        <li>You can change the opening paragraph and add headings, lists and links with the toolbar. Use the HTML button for full control.</li>
        <li>
          To hide a post without deleting it, untick <b>Published</b>.
        </li>
        <li>Pictures inside articles: use a full address (https://…) in the HTML view for now.</li>
        <li>You are signed out after 8 hours. Use Sign out on shared computers.</li>
      </ul>
      <p>
        Storage right now: <b>{storage === 'github' ? 'GitHub (live website)' : storage === 'local' ? 'local files (test mode on your computer)' : 'not set up'}</b>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- BIZEASE DESK: tool pages */
const lines = (a) => (Array.isArray(a) ? a.join('\n') : '');
const paras = (a) => (Array.isArray(a) ? a.join('\n\n') : '');
const splitLines = (t) => String(t || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
const splitParas = (t) => String(t || '').split(/\n\s*\n/).map((x) => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

function ToolsTab({ say, onAuth }) {
  const [items, setItems] = useState(null);
  const [slug, setSlug] = useState('');
  const fail = useGuard(onAuth, say);
  const load = useCallback(async () => {
    try {
      setItems((await api('GET', '/api/admin/tools')).items || []);
    } catch (e) {
      fail(e);
    }
  }, [fail]);
  useEffect(() => {
    load();
  }, [load]);
  if (slug) return <ToolEditor slug={slug} say={say} fail={fail} onBack={() => { setSlug(''); load(); }} />;
  return (
    <div className="adm-card">
      <h2>BIZEASE DESK tool pages</h2>
      <p className="sub">Change the wording of a tool page: title, explanation, example, common mistakes and questions. The calculator itself is not changed here. The website updates about a minute after you save.</p>
      {items === null ? (
        <p>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Desk</th>
                <th>Updated</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.slug}>
                  <td>
                    <span className="t">{it.name}</span>
                    <div style={{ color: 'var(--mute)', fontSize: '.8rem' }}>/desk/{it.desk}/{it.slug}/</div>
                  </td>
                  <td>{it.desk}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{it.updated}</td>
                  <td>{it.hidden ? <span className="pill off">Hidden</span> : <span className="pill">Published</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn sm ln" onClick={() => setSlug(it.slug)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5}>No tools found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToolEditor({ slug, say, fail, onBack }) {
  const [t, setT] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await api('GET', '/api/admin/tools/' + slug);
        const x = r.tool;
        setBlogs(r.blogs || []);
        setT({
          title: x.title || '',
          h1: x.h1 || '',
          description: x.description || '',
          lead: x.lead || '',
          intro: paras(x.intro),
          how: lines(x.how),
          example: x.example || '',
          mistakes: lines(x.mistakes),
          faq: (x.faq || []).map((f) => ({ q: f.q, a: f.a })),
          disclaimer: x.disclaimer || '',
          blogs: (x.related && x.related.blogs) || [],
          hidden: x.status === 'hidden',
          name: x.name,
        });
      } catch (e) {
        fail(e);
        onBack();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  if (!t) return <div className="adm-card">Loading…</div>;
  const set = (k) => (e) => setT({ ...t, [k]: e.target.value });
  const setFaq = (i, k, v) => setT({ ...t, faq: t.faq.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  async function save() {
    setBusy(true);
    try {
      await api('PUT', '/api/admin/tools/' + slug, { ...t, intro: splitParas(t.intro), how: splitLines(t.how), mistakes: splitLines(t.mistakes) });
      say('Saved. The tool page updates in about a minute.');
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }
  return (
    <div className="adm-card">
      <div className="bar">
        <button className="btn sm ln" onClick={onBack}>← All tools</button>
      </div>
      <h2>{t.name}</h2>
      <p className="sub">/{slug}/</p>
      <label htmlFor="tt">Page title (shown in Google)</label>
      <input id="tt" type="text" value={t.title} onChange={set('title')} />
      <label htmlFor="th">Heading on the page</label>
      <input id="th" type="text" value={t.h1} onChange={set('h1')} />
      <label htmlFor="td">Short description (for Google)</label>
      <textarea id="td" rows={2} value={t.description} onChange={set('description')} />
      <label htmlFor="tl">Line under the heading</label>
      <textarea id="tl" rows={2} value={t.lead} onChange={set('lead')} />
      <label htmlFor="ti">Explanation. Leave a blank line between paragraphs</label>
      <textarea id="ti" rows={8} value={t.intro} onChange={set('intro')} />
      <label htmlFor="to">How it works. One point per line</label>
      <textarea id="to" rows={5} value={t.how} onChange={set('how')} />
      <label htmlFor="te">Worked example</label>
      <textarea id="te" rows={3} value={t.example} onChange={set('example')} />
      <label htmlFor="tm">Common mistakes. One per line</label>
      <textarea id="tm" rows={5} value={t.mistakes} onChange={set('mistakes')} />
      <label>Questions and answers</label>
      {t.faq.map((f, i) => (
        <div className="jobrow" key={i}>
          <label htmlFor={'fq' + i}>Question {i + 1}</label>
          <input id={'fq' + i} type="text" value={f.q} onChange={(e) => setFaq(i, 'q', e.target.value)} />
          <label htmlFor={'fa' + i}>Answer</label>
          <textarea id={'fa' + i} rows={2} value={f.a} onChange={(e) => setFaq(i, 'a', e.target.value)} />
          <div className="bar" style={{ marginTop: 8 }}>
            <button className="btn sm bad" onClick={() => setT({ ...t, faq: t.faq.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        </div>
      ))}
      <div className="bar">
        <button className="btn ln" disabled={t.faq.length >= 10} onClick={() => setT({ ...t, faq: [...t.faq, { q: '', a: '' }] })}>+ Add a question</button>
      </div>
      <label htmlFor="tdis">Notice shown under the tool</label>
      <textarea id="tdis" rows={3} value={t.disclaimer} onChange={set('disclaimer')} />
      <label>Related articles (up to 6)</label>
      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: '4px 12px' }}>
        {blogs.map((b) => (
          <label className="chk" key={b}>
            <input
              type="checkbox"
              checked={t.blogs.includes(b)}
              disabled={!t.blogs.includes(b) && t.blogs.length >= 6}
              onChange={(e) => setT({ ...t, blogs: e.target.checked ? [...t.blogs, b] : t.blogs.filter((x) => x !== b) })}
            />
            <span>{b}</span>
          </label>
        ))}
      </div>
      <label className="chk">
        <input type="checkbox" checked={t.hidden} onChange={(e) => setT({ ...t, hidden: e.target.checked })} />
        <span>Hide this tool from the website</span>
      </label>
      <div className="bar">
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save tool page'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- BIZEASE DESK: rates and dates */
const RULE_LABELS = {
  agmDaysAfterYearEnd: 'Days after year-end to hold the AGM',
  agmExtensionDays: 'Days the AGM can be extended',
  firstAgmMonths: 'Months after incorporation for the first AGM',
  annualReturnDaysAfterAgm: 'Days after the AGM to file the annual return',
  accountsDaysAfterAgm: 'Days after the AGM to send the accounts',
  changeFilingDays: 'Days to report a change in directors or officers',
};

function RatesTab({ say, onAuth }) {
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useGuard(onAuth, say);
  useEffect(() => {
    (async () => {
      try {
        setV(await api('GET', '/api/admin/rates'));
      } catch (e) {
        fail(e);
      }
    })();
  }, [fail]);
  if (!v) return <div className="adm-card">Loading…</div>;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const setRule = (k, x) => setV({ ...v, rules: { ...v.rules, [k]: x } });
  const setExt = (i, k, x) => setV({ ...v, extensions: v.extensions.map((e, j) => (j === i ? { ...e, [k]: x } : e)) });
  async function save() {
    setBusy(true);
    try {
      await api('PUT', '/api/admin/rates', v);
      say('Saved. The tools update in about a minute.');
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }
  return (
    <div className="adm-card">
      <h2>Rates and dates</h2>
      <p className="sub">Figures the BIZEASE DESK tools use. Every figure needs a link to where you checked it. Last saved: {v.updated || 'never'}.</p>
      <h3>Federal sales tax rate</h3>
      <div className="row">
        <div>
          <label htmlFor="rf">Rate (%)</label>
          <input id="rf" type="text" inputMode="decimal" value={v.federal} onChange={set('federal')} />
        </div>
        <div>
          <label htmlFor="rc">Checked on</label>
          <input id="rc" type="date" value={v.federalChecked} onChange={set('federalChecked')} />
        </div>
      </div>
      <label htmlFor="rs">Where you checked it (https:// link)</label>
      <input id="rs" type="url" value={v.federalSource} onChange={set('federalSource')} />
      <h3 style={{ marginTop: 22 }}>Company compliance rules (SECP)</h3>
      <div className="row">
        {Object.keys(RULE_LABELS).map((k) => (
          <div key={k}>
            <label htmlFor={'ru' + k}>{RULE_LABELS[k]}</label>
            <input id={'ru' + k} type="text" inputMode="numeric" value={v.rules[k] ?? ''} onChange={(e) => setRule(k, e.target.value)} />
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 22 }}>Deadline extensions</h3>
      <p className="sub">When FBR or SECP moves a due date, add it here and the compliance calendars show the new date. The code must match the original deadline, for example itr-ind-2026 for the 2026 individual return or itr-co-2026 for the 2026 company return.</p>
      {v.extensions.map((x, i) => (
        <div className="jobrow" key={i}>
          <div className="row">
            <div>
              <label htmlFor={'ek' + i}>Code</label>
              <input id={'ek' + i} type="text" value={x.key} onChange={(e) => setExt(i, 'key', e.target.value)} />
            </div>
            <div>
              <label htmlFor={'ew' + i}>What was extended</label>
              <input id={'ew' + i} type="text" value={x.what} onChange={(e) => setExt(i, 'what', e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div>
              <label htmlFor={'eo' + i}>Original date</label>
              <input id={'eo' + i} type="date" value={x.original} onChange={(e) => setExt(i, 'original', e.target.value)} />
            </div>
            <div>
              <label htmlFor={'et' + i}>New date</label>
              <input id={'et' + i} type="date" value={x.extendedTo} onChange={(e) => setExt(i, 'extendedTo', e.target.value)} />
            </div>
          </div>
          <label htmlFor={'en' + i}>Note</label>
          <input id={'en' + i} type="text" value={x.note || ''} onChange={(e) => setExt(i, 'note', e.target.value)} />
          <label htmlFor={'es' + i}>Source link (https://)</label>
          <input id={'es' + i} type="url" value={x.source} onChange={(e) => setExt(i, 'source', e.target.value)} />
          <div className="bar" style={{ marginTop: 8 }}>
            <button className="btn sm bad" onClick={() => setV({ ...v, extensions: v.extensions.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        </div>
      ))}
      <div className="bar">
        <button className="btn ln" disabled={v.extensions.length >= 30} onClick={() => setV({ ...v, extensions: [...v.extensions, { key: '', what: '', original: '', extendedTo: '', note: '', source: '' }] })}>
          + Add an extension
        </button>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <div>
          <label htmlFor="cc">Calendar rules and dates checked on</label>
          <input id="cc" type="date" value={v.calChecked} onChange={set('calChecked')} />
        </div>
      </div>
      <div className="bar">
        <button className="btn dk" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save rates and dates'}
        </button>
      </div>
    </div>
  );
}
