# BayGrub.club

Local restaurant picker with a two-step opening:

1. Click the delivery box. Its lid opens and the restaurant reel emerges. No restaurant is chosen yet.
2. Click Spin. The 13-second reel decelerates, settles under the center marker and reveals the selected restaurant, address, information link and directions.

Close box hides the reel. Spin again repeats the roll. The original artwork is unchanged; the logo stays at the top and the forest sways below the picker. There are no purchases.

## Restaurant pool

80 local restaurants: the previous 29 vetted places plus 51 additional listings from local directories and restaurant websites. National and regional chains are excluded where identified. The new directory listings have not each been independently audited for ownership or current operating status; verify before visiting. Sources are linked in each restaurant record.

The area is a seven-mile straight-line radius centered on City Center Bishop Ranch, 6000 Bollinger Canyon Road, San Ramon. All records have US Census address-geocoder distance estimates within seven miles. This is not an exhaustive directory or a live open-now feed. Check the restaurant for hours and menus.

Every eligible restaurant has equal odds, including repeat selections. The winner is sampled with Web Crypto rejection sampling, inserted in the reel and centered on the marker. Every roll uses the full restaurant pool.

## Restaurant identity assets

16 usable logos were downloaded from the restaurants' official website headers into public/logos/. Their original asset URLs are recorded as logoSource in restaurants.js. Brand images remain unchanged. An unusable blank logo was rejected.

Each card includes the restaurant's name and cuisine. Missing or failed logos fall back to a name-initial emblem with a cuisine badge; these emblems are not official logos. The same identity treatment appears in the list and result dialog. No external logo service or visitor tracking request is used.

## Motion and sound

The reel uses a continuous quartic slowdown, speed-dependent blur, a short final settle and an optional synthesized tick per card crossing. Sound starts off. Animation on/off is visible below the reel and remembered locally. On a first visit, reduced-motion preferences select an instant result. Pause/resume works during a roll. Revealing the reel does not start a spin.

## Local preview

    npm install
    npm run dev

Open http://127.0.0.1:5173. No backend or API key is needed.

## Cloudflare Workers Builds

- Project name: baygrub
- Build command: npm run build
- Deploy command: npx wrangler deploy
- Preview command: npx wrangler preview
- Root directory: leave blank
- Production branch: main

The build copies the site and public assets into dist/. wrangler.jsonc configures Workers static assets. Pushes to the connected production branch trigger deployment after Cloudflare is configured.

## Editing

index.html holds the layout; styles.css controls layout and animation; app.js handles reveal, spinning and motion; restaurants.js holds the restaurant pool, cuisine key and logo provenance. public/baygrub.jpg is the original artwork.
