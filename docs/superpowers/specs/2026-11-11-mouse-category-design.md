# Mouse category: design

Date: 2026-11-11. Implementation started with the owner's approval. The category remains disabled and invisible; no mouse data has been collected or published. Progress and the code-grounded clarifications are in `../plans/2026-11-11-mouse-category.md`.

## Goal

A second peripheral category, computer mice («Ποντίκια»), at `/mouse` and `/mouse/<slug>`, built the same way as monitors: prices from the shops, one product per real model, filters on stated specs only, comparison through the existing engine.

## Owner decisions (2026-11-11)

1. Skroutz: list pages only, for both of its mouse categories. No product page, no `shops_list`, no `price_graph`.
2. Sources: BestPrice, Skroutz, Snif. e-shop.gr and Shopflix are off, for the same reasons as monitors (e-shop's `offset=` paging against its robots.txt; Shopflix access).
3. Colour is a variant of one product, not a product of its own.
4. No timeout change: the run split of 2026-11-11 gives the room (`docs/superpowers/plans/2026-11-11-scraper-run-split.md`).
5. Mice stay out of the PC Builder and never reach the compatibility engine.
6. No `/peripherals` landing page. The menu group "Peripherals" lists monitors and mice.
7. Branch `feat/mouse-category`. Commits with the owner's identity, no co-author line.

Earlier decisions that still hold: flat addresses (D1), hidden data first and visible only after review, every text in Greek and English, unknown stays unknown.

## What the sources give (list pages only, read 2026-11-11)

| Source | Address | Size | What a list row states |
| --- | --- | --- | --- |
| BestPrice | `/cat/2569/pontikia.html` | 2,786 products; 800 per list, so price slices | title: brand, name, «Ενσύρματο»/«Ασύρματο», Bluetooth, «Εργονομικό», Mini, Silent, colour, sometimes a part number |
| Skroutz gaming | `/c/1865/gaming_pontikia.html` | 1,709 products, about 48 pages | title: brand, name, connection, colour. Spec line: `Κουμπιά:13, 25600 DPI, RGB, Polling Rate:1000Hz` |
| Skroutz office | `/c/69/mice.html` | 2,244 products, about 48 pages | title: brand, name, connection, «Vertical», colour. Spec line: `RF 2.4GHz, Bluetooth, USB, Επαναφορτιζόμενο` |
| Snif | `/category/1919852/` | size not shown on the page (the reader follows "next") | shop titles in mixed form: `Ποντίκι Logitech M171 Wireless Black 910-004424`, `MARVO M450 Scorpion Ενσύρματο Gaming Mouse` |

Two facts that shape the design:

- Titles carry a name ("Logitech G502 X Plus", "MX Master 3S"), rarely a model code. Identity is by name, as for cases, fans and coolers, not by code as for monitors.
- Snif's mouse list holds mouse pads, a mouse bungee and a USB hub. Rejection is needed from the first run.

## Scraper

### Category entry

`mouse` in `scraper/category_ids.py` (last) and `scraper/categories.py`:

- `skroutz_paths`: the gaming list and the office list.
- `bestprice_paths`: `/cat/2569/pontikia.html` in price slices (cents). The slice edges are set from one count per slice before the first run, so no slice passes 50 pages.
- `snif_categories`: `("1919852",)`.
- `make_listing`, `settle`: from the new `scraper/normalize_mouse.py`.
- `model_key`: `names.model_key(chip)`, where `chip` is brand plus model name plus the identity words below.
- `shared`: `dpi`, `pollingHz`, `buttons`, `rgb`, `gaming`, `bluetooth`, `rf`, `rechargeable`, `ergonomic`, `silent`.
- `rejects=True`, `images=True`.

`scraper/capabilities.py`: Skroutz does lists only for `mouse` (`SPECS`, `SHIPPING`, `HISTORY` off); e-shop and Shopflix do nothing for `mouse`.

### Gaming or office

Skroutz keeps two lists, so the source itself says which is which. `Category` gets `skroutz_tags`, the same idea as the existing `bestprice_tags`: one dict per Skroutz path, stamped on every listing of that path (`{"gaming": True}`, `{"gaming": False}`). The Skroutz reader stamps them where it reads a path, the way `sources/bestprice.py:63` does. For BestPrice and Snif, `gaming` is true only when the title says "Gaming", otherwise unknown. `shared` then gives a model the value one source states.

### Fields (`MouseListing` in `scraper/models.py`, mirrored in `src/types.ts`)

Always: `id, source, title, url, price, shopCount, brand, chip, scrapedAt, reject`.

From the title or the Skroutz spec line, `None` when not stated:

| Field | Type | From |
| --- | --- | --- |
| `connection` | `"wired" \| "wireless" \| "both"` | «Ενσύρματο», «Ασύρματο», «Ασύρματο & Ενσύρματο», Wired, Wireless |
| `bluetooth` | bool | title, Skroutz office line |
| `rf` | bool | "RF 2.4GHz", "2.4GHz", "2.4G" |
| `rechargeable` | bool | «Επαναφορτιζόμενο», Rechargeable |
| `dpi` | int (the highest stated) | Skroutz gaming line, "1600dpi" in a title |
| `pollingHz` | int | Skroutz gaming line |
| `buttons` | int | Skroutz gaming line, «3 Κουμπιά» in a title |
| `rgb` | bool | Skroutz gaming line, title |
| `gaming` | bool | Skroutz list, title word |
| `ergonomic` | bool | «Εργονομικό», Vertical, Ergonomic |
| `silent` | bool | Silent, «Αθόρυβο» |
| `colour` | text | title, from a fixed colour list |
| `partNumber` | text | a maker part number in the title (`910-004424`, `6VY96AA`) |

Not in the first version: weight, sensor model, battery life, dimensions, switch model, grip, operating systems, per-mode polling rate. They come later from BestPrice product pages as `pg*` observations, after a probe of a few pages shows which fields exist. No maker sites.

A true value never becomes false because another listing does not mention it. A missing word is unknown, not "no".

### Identity

`chip` = brand + cleaned model name. Cleaning removes: the Greek and English words for mouse, connection words, colour, part number, marketing words. It keeps every word that names a different product: Pro, Plus, SE, Lite, Mini, Max, X, V2, 2S, 3S, Wireless or Lightspeed when it is part of the name, "for Mac", "for Business", "Bluetooth Edition".

Rules, all in `settle()`:

1. Same brand and same cleaned name: one model, unless rule 2 or 3 says no.
2. A listing that states wired never joins one that states wireless. A model whose listings state both connections separately is split in two.
3. Two listings with different part numbers of the same colour are not joined by part number alone; the name decides. The same part number on two listings with different cleaned names is a conflict: both go to `rejected.json` with reason `identity-conflict`.
4. A listing with no stated connection joins a model only when that name has exactly one connection among its listings. Unknown never joins two known variants together.
5. Colour never makes a new model. It is kept on the listing and shown as a variant.
6. No brand, or no name left after cleaning: rejected with reason `no-identity`.

### Rejection

`reject` reasons, written to `public/data/mouse/rejected.json` with the title:

- `not-mouse`: mouse pad, mousepad, «μαξιλαράκι», bungee, feet, skates, grip tape, receiver or dongle alone, charging dock, USB hub, cable, replacement switch or shell, wrist rest, presenter, trackpad, graphics tablet, game controller.
- `bundle`: a set with a keyboard, headset or pad ("Combo", «Σετ», "+ Mousepad", "Keyboard & Mouse").
- `used`: used, refurbished, open box.
- `no-identity`, `identity-conflict`: see above.

A product that includes a pad as a gift stays a bundle: its price is not the mouse's price.

Trackballs and vertical mice are mice.

## Site

Registry: `mouse: { domain: 'peripherals', enabled: true, visible: false }`, then `visible: true` at release.

- **Address and names:** `/mouse`; «Ποντίκια» / "Mice", one «Ποντίκι» / "Mouse".
- **Pills:** all, wireless, wired.
- **Filters:** brand; use (gaming, office); Bluetooth; 2.4 GHz; rechargeable; DPI at least; polling rate at least; buttons at least; RGB; silent; ergonomic; colour. A filter matches only a stated value. A product with an unknown value never passes a spec filter.
- **Sorting:** the existing ones (recommended, price, discount). No "best" mark. Recommended = popularity 0.7 + price 0.3, as for monitors; a higher DPI is not a better mouse.
- **Card spec line:** connection, DPI, polling rate, buttons, when stated.
- **Product page:** offers table, price history, colour variants, spec rows in the existing four groups: general (brand, use, buttons, RGB, silent, ergonomic), connections (connection, Bluetooth, 2.4 GHz), power (rechargeable), general again for DPI and polling rate. Rows with no stated value are not shown.
- **Comparison:** works from the spec rows; no new code.
- **Search, sitemap, per-address pages, deals:** come from the registry.
- **Home:** `HOME_PERIPHERALS` reads the peripheral categories from the registry instead of a fixed `['monitor']`.

Limits that hold: first load JS up to 110 KB and data up to 300 KB gzip, CLS 0, works at 360 px, dark only, tokens only. With about 6,000 listings the list file is the size of the monitor one, so `LIST_SKIP_BY_CATEGORY.mouse` leaves out what rows do not use (`partNumber`, `colour`) and `/mouse` gets the same preload as `/monitor` if the measurement asks for it.

## Phases

1. **Scraper, hidden.** `models.py`, `normalize_mouse.py`, `categories.py`, `category_ids.py`, `capabilities.py`, `skroutz_tags` in the Skroutz reader; the type and a first simple entry in each `Record<Category, …>` map of the site so `tsc` passes; `visible: false`. Tests: `scripts/checks/test_normalize_mouse.py` on real titles from the four lists and the hard negatives above.
2. **First data.** One Skroutz run and one shops run, started with the owner's yes. Then a report: listings per source, models, every reject reason with its count and twenty samples each, fifty merged models picked at random, the share of unknown per field. The owner reads it. Rules are fixed and the report repeated until it is clean.
3. **Site.** Filters, spec rows, key specs, texts, menu, home, `vercel.json`, `site-check.mjs`, `MIN_MODELS.mouse`. Unit tests and Playwright tests. `visible: true` only with the owner's yes.
4. **Product pages** (weight, sensor, battery) after a probe, as a plan of its own.
5. **Documents:** `CLAUDE.md`, `docs/PROJECT-STATE.md`, `docs/ADDING-A-CATEGORY.md`.

Each phase ends with `npm run check`, the Python checks and a report. Nothing is pushed without the owner's yes.

## Cost

- BestPrice: about 175 list pages and 60 shipping pages per run, about 8.5 minutes in the `prices` job.
- Skroutz: about 96 list pages per run through the proxy, twice a day.
- Snif: unknown until the first run.
- Images repository: one photo per model; the number of models is known after phase 2.

## Risks

| Risk | What limits it |
| --- | --- |
| Two different mice joined because their names are close (G502 X and G502 X Plus) | identity words are kept, rule 2 and rule 4, the fifty-model sample in phase 2 |
| One mouse split in several because shops write its name differently | the phase 2 report shows models with one listing; aliases as for other categories |
| Pads and sets counted as mice | reject rules, `rejected.json` read in phase 2 |
| Many unknown specs at launch (BestPrice and Snif state little) | `shared` spreads what Skroutz states; filters show stated values only; product pages in phase 4 |
| More Skroutz requests through one proxy address | lists only; the existing gate and circuit breaker; the first run is watched |
| Run time | measured after the first shops run with mice; the next lever is in the run-split plan |

## Not checked

- The number of Snif mouse pages.
- Which fields BestPrice mouse product pages state.
- How many models have listings on only one source.
- Whether Skroutz's two lists overlap (one mouse in both). If they do, the gaming list's tag wins.
