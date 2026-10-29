# BIZEASE SOLUTIONS website (Next.js)

Next.js (React) version of the website: every page is a real page with its own address, the same design and content as before, SEO carried over, plus an admin panel at `/admin/`.

> **Honest note:** the code was checked on a test machine without access to the Next.js package. All 77 pages were rendered and clicked through in a browser with a stand-in for Next.js, and the admin panel and the Python backend were tested against fake GitHub and fake mail servers. The real `next build` has not been run. If Vercel shows a red build error, copy the last 30 lines of the build log and send them; it is normally a small fix.

---

## 1. Put the code on GitHub (new repository)
Make a **new** repository (for example `bizease-next`). Do not touch the repository of the old website; it keeps running until you switch.

The folder has about 106 files. GitHub's drag-and-drop accepts 100 at a time, so either upload in two batches (first `app`, `components`, `lib`; then the rest), or use GitHub Desktop / git:

```
cd bizease-next
git init && git add . && git commit -m "BIZEASE Next.js website"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/bizease-next.git
git push -u origin main
```
Make sure `package.json` is at the top level of the repository, not inside another folder.

## 2. Deploy on Vercel
1. vercel.com > **Add New > Project** > import the new repository. Framework is detected as **Next.js**. Do not change build settings.
2. Before pressing Deploy, open **Environment Variables** and add (see section 3).
3. Deploy. You get an address like `bizease-next.vercel.app`. Check the site there first.
4. When happy: Project > Settings > **Domains** > add `www.bizeasesolutions.online` (and `bizeasesolutions.online`). Remove the domain from the old Vercel project first, then follow the DNS hints Vercel shows. Pages, sitemap (`/sitemap.xml`), robots and `llms.txt` keep the same addresses. Old blog links ending in `.html` are redirected to the new clean address automatically (301).

## 3. Environment variables (Vercel > Settings > Environment Variables)
| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | the password you will type on `/admin/` (8+ characters) |
| `ADMIN_SECRET` | any long random text (32+ characters). Not a password you type; it signs the login cookie |
| `GITHUB_TOKEN` | GitHub > Settings > Developer settings > Fine-grained tokens > new token, only this repository, permission **Contents: Read and write** |
| `GITHUB_REPO` | `your-github-name/bizease-next` |
| `GITHUB_BRANCH` | `main` |
| `NEXT_PUBLIC_FORMS_API` | address of the Python backend, e.g. `https://api.bizeasesolutions.online` (add after step 5; redeploy once after adding) |

After changing variables, **Deployments > Redeploy**. Never put AI keys or the mail password in this project; they belong only in the Python backend.

## 4. The admin panel: `/admin/`
Sign in with `ADMIN_PASSWORD`. You can:
- **Blog posts**: add, edit, hide, delete. Visual editor with headings, lists and links, or raw HTML. Choose related services and hashtags.
- **Jobs**: the openings shown on the Careers page and in the application form's position list.
- **Applications**: links for BIZLOAN ERP, BIZBOOK and BIZKHATA (empty = "Link coming soon").
- **BIZBOT**: switch AI answers on or off.

Every Save is a commit to GitHub; Vercel rebuilds and the change is live in about a minute. New blog posts also become searchable for BIZBOT automatically. Page wording and design are not edited in the panel; they live in `content/shells/*.html`, `app/globals.css` and the `components` folder.

Safety: one password, signed `HttpOnly` cookie (8 hours), same-origin check on every save, login throttling, article HTML is cleaned (no scripts). `/admin/` and `/api/` are not indexed by Google.

## 5. Python backend (forms, career applications, BIZBOT AI)
Folder `bizbot-ai-backend` (separate from this project). Deploy it on Render, Railway or any Python host (see its README). It needs the mail settings (`SMTP_*`, mail goes to `info@bizeasesolutions.online`) and at least one AI key. Then:
1. Give it the address `api.bizeasesolutions.online` (or any address; if different from that, put it in `NEXT_PUBLIC_FORMS_API` and in the BIZBOT box of the admin panel, and redeploy).
2. In Vercel set `NEXT_PUBLIC_FORMS_API`, redeploy.
3. In `/admin/` > BIZBOT tick **Turn AI answers on** and Save.
Until then the Contact page falls back to WhatsApp / your email app, and BIZBOT answers from the website content only. The career form needs the backend (without it, it posts to formsubmit.co as before).

## 6. Run on your own computer (optional)
Install Node.js 20+, then in this folder: `npm install`, then `npm run dev`, open http://localhost:3000. For the admin panel locally, create `.env.local` with `ADMIN_PASSWORD` and `ADMIN_SECRET` only (no GitHub token): saves are then written straight to the `content` folder.

## Where things are
- `content/shells/*.html` page bodies (home, about, services, calculators, contact...)
- `content/blog/*.json` blog posts, `content/jobs.json`, `content/apps.json`, `content/landing.json` (11 service pages), `content/routes.json` (page titles, descriptions, structured data)
- `public/legacy/site.js` calculators and tools, `public/legacy/cfo.js` CFO Desk, `public/legacy/bizbot.js` BIZBOT
- `app/` pages and API, `components/` header, footer, blog list, admin, `next.config.mjs` redirects and security headers
