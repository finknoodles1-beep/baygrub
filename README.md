# BayGrub.club

An animated coming-soon page built from the supplied BayGrub artwork. Responsive layouts, gently swaying photo, floating stars, pointer parallax, fireflies, and an accessible pause control. Reduced-motion preferences are respected.

## Local preview

Install Node.js, then run:

    npm install
    npm run dev

Open http://127.0.0.1:5173. No framework or backend is required.

## Cloudflare Workers Builds

Connect this GitHub repository and use:

- Project name: baygrub
- Build command: npm run build
- Deploy command: npx wrangler deploy
- Preview command: npx wrangler preview
- Root directory: leave blank
- Production branch: main

The build copies the website and artwork into dist/. wrangler.jsonc configures Workers static assets. Pushes to the connected production branch trigger deployment after Cloudflare is configured.

## Editing

index.html holds the composition; styles.css controls responsive layouts and animation; app.js controls motion preferences and particles. public/baygrub.jpg is the original artwork, unchanged. SVG view boxes and clip paths reuse it without stretching the logo or character.
