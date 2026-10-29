// Where the admin panel saves content.
//  - on Vercel: commits files to your GitHub repo (Vercel then redeploys automatically)
//  - on your own computer (npm run dev, no GitHub token): writes the files directly
import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from './adminApi';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const ALLOWED = [/^content\/(blog\/[a-z0-9-]+\.json|jobs\.json|apps\.json)$/, /^public\/bizbot-config\.json$/];

export function mode() {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) return 'github';
  return process.env.NODE_ENV === 'production' ? 'none' : 'local';
}

function check(p) {
  if (!ALLOWED.some((r) => r.test(p))) throw new ApiError('That file cannot be changed from the admin panel.', 400);
}
function dirOk(p) {
  if (p !== 'content/blog') throw new ApiError('Not allowed.', 400);
}
function need() {
  if (mode() === 'none') throw new ApiError('Saving is not set up. Add GITHUB_TOKEN and GITHUB_REPO in Vercel, then redeploy.', 503);
}

async function gh(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bizease-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 404) return { status: 404 };
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  if (res.status === 401 || res.status === 403) throw new ApiError('GitHub refused the request. Check that GITHUB_TOKEN is valid and has "Contents: Read and write" for this repository.', 502);
  if (res.status === 409 || res.status === 422) throw new ApiError('This file was changed somewhere else a moment ago. Reload the page and try again.', 409);
  if (!res.ok) throw new ApiError('GitHub error (' + res.status + '). Please try again.', 502);
  return { status: res.status, data };
}

const repoUrl = (p) => `/repos/${process.env.GITHUB_REPO}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
const branch = () => process.env.GITHUB_BRANCH || 'main';

export async function readFile(p) {
  need();
  check(p);
  if (mode() === 'local') {
    try {
      return { text: await fs.readFile(path.join(process.cwd(), p), 'utf8'), sha: 'local' };
    } catch (e) {
      return null;
    }
  }
  const r = await gh('GET', repoUrl(p) + '?ref=' + encodeURIComponent(branch()));
  if (r.status === 404) return null;
  return { text: Buffer.from(r.data.content || '', 'base64').toString('utf8'), sha: r.data.sha };
}

export async function writeFile(p, text, message) {
  need();
  check(p);
  if (mode() === 'local') {
    const f = path.join(process.cwd(), p);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, text);
    return;
  }
  const cur = await gh('GET', repoUrl(p) + '?ref=' + encodeURIComponent(branch()));
  await gh('PUT', repoUrl(p), {
    message,
    content: Buffer.from(text, 'utf8').toString('base64'),
    branch: branch(),
    ...(cur.status === 200 ? { sha: cur.data.sha } : {}),
  });
}

export async function deleteFile(p, message) {
  need();
  check(p);
  if (mode() === 'local') {
    await fs.rm(path.join(process.cwd(), p), { force: true });
    return;
  }
  const cur = await gh('GET', repoUrl(p) + '?ref=' + encodeURIComponent(branch()));
  if (cur.status !== 200) return;
  await gh('DELETE', repoUrl(p), { message, sha: cur.data.sha, branch: branch() });
}

export async function listDir(p) {
  need();
  dirOk(p);
  if (mode() === 'local') {
    try {
      return (await fs.readdir(path.join(process.cwd(), p))).filter((f) => f.endsWith('.json'));
    } catch (e) {
      return [];
    }
  }
  const r = await gh('GET', repoUrl(p) + '?ref=' + encodeURIComponent(branch()));
  if (r.status === 404 || !Array.isArray(r.data)) return [];
  return r.data.filter((f) => f.type === 'file' && f.name.endsWith('.json')).map((f) => f.name);
}
