# BayGrub.club

A local restaurant case opener inspired by the rolling reveal of game cases. Click the delivery box for a 13-second reel: fast scrolling, continuous deceleration, a slow final approach and a short settle. Optional synthesized ticks follow card crossings. The result includes its address, information link and Google Maps link. There are no payments or purchases.

The original artwork remains unchanged. The logo sits at the top, and the forest sways beneath the playable area. Desktop and mobile layouts, pause/resume, reduced-motion preferences, cuisine filters, a searchable list and repeat openings are supported. Animation on/off is visible below the reel and is remembered locally. On a first visit, reduced-motion preferences default the reel to an instant result. Sound is off until enabled.

## Restaurant pool

86 curated locations across San Ramon, Danville and Dublin, within a seven-mile straight-line area centered on City Center Bishop Ranch, 6000 Bollinger Canyon Road, San Ramon. This is a curated list, not an exhaustive directory or a live open-now feed. Hours and dietary suitability must be checked with the restaurant.

Each entry in restaurants.js includes an address, cuisine, emoji and source. Official restaurant pages, the City Center Bishop Ranch directory, and the Town of Danville dining directory were consulted on November 4, 2026. US Census address geocoding confirmed distances for 82 of 86 locations. Four addresses could not be resolved by the geocoder and were retained based on their streets in central Danville/San Ramon/west Dublin, well inside the area. Distance values are approximate, not driving distances. One Fallon Road location outside seven miles was excluded.

Every restaurant in the active cuisine pool has an equal chance, including repeat selections. The winner is sampled first with rejection sampling from Web Crypto, inserted into the reel, and centered exactly on the marker. Cuisine colors are visual labels and do not change selection odds. Changing the cuisine filter changes the eligible pool.

Main sources:
- https://citycenterbishopranch.com/directory/dining/
- https://www.danville.ca.gov/1066/Eat-in-Danville
- Official location links in each restaurant record
- https://geocoding.geo.census.gov/geocoder/

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

The build copies the website and artwork into dist/. wrangler.jsonc configures Workers static assets. Pushes to the connected production branch trigger deployment after Cloudflare is configured.

## Editing

index.html holds the layout; styles.css controls responsive layouts and animation; app.js controls the case opening and motion; restaurants.js holds the pool and cuisine key. public/baygrub.jpg is the original artwork, unchanged.
