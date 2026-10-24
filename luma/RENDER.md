# Render deployment

Deploy this Next.js application as a **Node web service**, because its catalog, search, subtitle and media-resolution routes require a server. A static-site deployment would disable those routes.

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm run start -- --hostname 0.0.0.0`
- Health check: `/`
- Node version: `24.21.0`, pinned in `.node-version`
- Compute: Free; no paid service, database, worker, disk or native CineSrc browser service is required.
- Root directory: the directory containing this `package.json` (`luma` if this app is added to a repository under that folder).

Next.js reads Render's `PORT` environment variable. No application API keys or secrets are required. Keep the protected embed behavior and local-browser saved titles/history. Video streams are not relayed through Render.

The YouTube collection includes a verified fallback manifest and bounded live discovery from approved official publishers. Upstream failures do not make the web-service readiness check fail.

Publish only application source and public assets. Exclude `node_modules`, `.next`, `.netlify`, `.env*`, runtime caches, personal viewing data, and the separately archived native CineSrc module. The existing Netlify configuration can stay in the source; Render does not use it.
