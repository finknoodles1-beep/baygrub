# BayGrub.club

Local restaurant picker with a two-step opening:

1. Click the delivery box. Its lid opens and the restaurant reel emerges. No restaurant is chosen yet.
2. Click Spin. The 13-second reel decelerates, settles under the center marker and reveals the selected restaurant, address, information link and directions.

Once selected, the shared pick stays until someone posts a review with a photo, date, and tier or resets it. Posting returns to the picker; reviews can be viewed and edited in Tier list & history. The Beast button opens the payer picker. Its five reels are independent; five matching names choose the sponsor, and any other result can be spun again. The original artwork is unchanged; the logo stays at the top above an animated sunset, with moving rays, clouds, birds, stars and a swaying forest. There are no purchases.

## Restaurant pool

80 local restaurants: the previous 29 vetted places plus 51 additional listings from local directories and restaurant websites. National and regional chains are excluded where identified. The new directory listings have not each been independently audited for ownership or current operating status; verify before visiting. Sources are linked in each restaurant record.

The area is a seven-mile straight-line radius centered on City Center Bishop Ranch, 6000 Bollinger Canyon Road, San Ramon. All records have US Census address-geocoder distance estimates within seven miles. This is not an exhaustive directory or a live open-now feed. Check the restaurant for hours and menus.

Every eligible restaurant has equal odds, including repeat selections. The winner is sampled with Web Crypto rejection sampling, inserted in the reel and centered on the marker. Every roll uses the full restaurant pool.

## Restaurant identity assets

16 usable logos were downloaded from the restaurants' official website headers into public/logos/. Their original asset URLs are recorded as logoSource in restaurants.js. Brand images remain unchanged. An unusable blank logo was rejected.

Each card includes the restaurant's name and cuisine. Missing or failed logos fall back to a name-initial emblem; these emblems are not official logos. The same identity treatment appears in the list and result dialog. No external logo service or visitor tracking request is used.

## Motion and sound

The reel uses a continuous quartic slowdown, speed-dependent blur, a short final settle and an optional synthesized tick per card crossing. Sound starts off. Animation on/off is visible below the reel and remembered locally. On a first visit, reduced-motion preferences select an instant result. Pause/resume works during a roll. Revealing the reel does not start a spin.

## Local preview

    npm install
    npm run dev

Open http://127.0.0.1:5174. The local preview uses a local SQLite database in .wrangler/; it is separate from the live shared database. Node 22.13 or newer is required for node:sqlite.

## Cloudflare Workers Builds

- Project name: baygrub
- Build command: npm run build
- Deploy command: npx wrangler deploy
- Preview command: npx wrangler preview
- Root directory: leave blank
- Production branch: main

The build copies the site and public assets into dist/. The Worker serves /api/* and Cloudflare D1 stores the shared pick, reviews, and compressed photos. Wrangler automatically provisions the D1 binding on the first deployment; the Worker creates its tables. Pushes to the connected production branch trigger deployment after Cloudflare is configured. Everyone who can access the site can add, edit, delete, and reset group data. The local preview uses separate data.

## Editing

index.html holds the layout; styles.css controls layout and animation; app.js handles reveal, spinning and motion; restaurants.js holds the restaurant pool, cuisine key and logo provenance. public/baygrub.jpg is the original artwork.
