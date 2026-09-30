HARDWARE PRICES GR  /  ΤΙΜΕΣ HARDWARE
=====================================

Copyright (c) 2026 Teo Ampatzis (https://github.com/TeoAmpatzis). All rights reserved
except as granted in the LICENSE file.

Created, designed and owned by Teo Ampatzis.


WHAT IT IS
----------
A website that tracks PC hardware prices in the Greek market and shows, for every product,
the lowest price available right now and how it has changed over time.

Categories: graphics cards, processors, motherboards, memory (RAM), power supplies, cases,
case fans and CPU coolers.

Prices are collected from the Greek price-comparison sites Skroutz and BestPrice and the
shop e-shop.gr, every 6 hours. Listings of the same product from different sites are merged,
so each product shows its cheapest offer, the price including shipping where it is known,
a 7-day change and a price-history chart.

Planned: a PC builder that picks compatible parts (socket, memory type, board size...) and
the best-value build for a given budget, using the current Greek prices.


ΤΙ ΕΙΝΑΙ (Ελληνικά)
-------------------
Ιστοσελίδα που παρακολουθεί τις τιμές hardware υπολογιστών στην ελληνική αγορά και δείχνει,
για κάθε προϊόν, τη χαμηλότερη τιμή αυτή τη στιγμή και την πορεία της στο χρόνο. Οι τιμές
συλλέγονται από Skroutz, BestPrice και e-shop.gr κάθε 6 ώρες.

Δημιουργός και κάτοχος του έργου: Teo Ampatzis.


HOW IT WORKS
------------
  scraper/     Python scraper (curl_cffi + selectolax). Run by GitHub Actions every 6 hours;
               writes public/data/<category>/latest.json and history.json.
  src/         React + TypeScript + Tailwind website (Vite), deployed on Vercel.
               It reads the JSON files; there is no backend.

Run it locally:
  npm install
  npm run dev                                    (website on http://localhost:5174)

  python -m venv venv
  venv/Scripts/pip install -r scraper/requirements.txt
  venv/Scripts/python scraper/main.py --category gpu


LICENSE (summary - the LICENSE file is what counts)
---------------------------------------------------
The source code is published under the PolyForm Noncommercial License 1.0.0
(https://polyformproject.org/licenses/noncommercial/1.0.0).

  - You may read, run, study and modify the code for NON-COMMERCIAL purposes
    (personal use, learning, research, hobby projects).
  - Any COMMERCIAL use - including running this site or a copy of it for profit, selling it,
    or using it in a commercial product or service - is NOT allowed without a separate
    written license from the copyright owner.
  - Anyone who shares the code or anything based on it must include the LICENSE terms and the
    "Required Notice" line crediting Teo Ampatzis as the author.
  - Teo Ampatzis keeps all copyright in the project and may license it under other terms,
    including commercial licenses.

For commercial licensing or any other permission, contact the owner through GitHub:
https://github.com/TeoAmpatzis

Name and branding: the project name, logo and visual identity are not licensed for use by
others. Forks and copies must not present themselves as this project or its author.


DATA AND TRADEMARKS
-------------------
Prices, product names and links are collected from public pages of third-party websites and
belong to their respective owners; no ownership of that data is claimed. This project is not
affiliated with, endorsed or sponsored by Skroutz, BestPrice, e-shop.gr, or any manufacturer
or shop. All trademarks (for example product and brand names) belong to their owners.

Prices are shown for information only, may be out of date and may differ from the price in
the shop. Always check the price and availability on the shop's own website before buying.
The software and the information it shows are provided "as is", without any warranty.
