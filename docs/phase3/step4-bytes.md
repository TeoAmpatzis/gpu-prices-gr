# Step 4, task 2: list.json bytes (gzip KiB, 17/10/2026)

Measured with `npx tsx scripts/phase3/list-bytes.mts all` on `dist/data/<cat>/list.json` after `npm run build`
(same scrape data before and after). Rule 11: data per page <= 300 KiB.

| category | before | after | rows | hist before -> after | img -> photos | imported |
|---|---:|---:|---:|---:|---:|---:|
| gpu | 43.3 | 41.8 | 38.2 | 2.5 -> 2.1 | 1.2 -> 0.0 | 1.0 |
| cpu | 56.0 | 50.6 | 36.8 | 10.3 -> 9.1 | 4.5 -> 0.1 | 4.0 |
| mobo | 126.5 | 110.6 | 76.2 | 26.5 -> 24.5 | 13.8 -> 0.1 | 9.5 |
| ram | 181.2 | 175.2 | 161.7 | 10.2 -> 9.1 | 5.0 -> 0.1 | 3.6 |
| storage | 227.3 | 200.4 | 150.6 | 45.3 -> 41.3 | 23.4 -> 0.2 | 7.4 |
| psu | 106.8 | 104.3 | 98.8 | 4.0 -> 3.4 | 1.9 -> 0.0 | 1.5 |
| case | 286.5 | 251.6 | 190.4 | 54.2 -> 49.7 | 31.0 -> 0.3 | 10.1 |
| fan | 177.4 | 152.1 | 105.4 | 37.7 -> 35.3 | 23.3 -> 0.2 | 10.7 |
| cooler | 197.4 | 171.0 | 118.2 | 43.3 -> 40.4 | 23.6 -> 0.2 | 11.4 |
| all | 1402.3 | 1257.7 | | | | |

`/case` data: 286.5 -> 251.6 KiB (target <= 255; 48.4 KiB room under 300).

What changed: `img` (model key -> "<cat>/<id>") became `photos`, a base64 bitset over the sorted model keys
(the id is the SHA-1 of "<cat>\0<key>", computed in the browser); `hist` became flat numbers (day offsets from
`histBase`, prices in cents). `rows`, `imported`, header unchanged.

## Next candidates (not done, owner decides)

`rows` is now 76% of `/case` (190.4 KiB). Biggest columns of `/case` rows alone: title 44.8, id 31.5, chip 18.7,
price 15.3, total 9.0, merchant 6.1, radiatorMounts 4.8, shipping 4.0. Ideas: `title` and `id` per listing
(76 KiB together) are only read in the expanded row and for search; `merchant`/`total`/`shipping` (19 KiB)
only for the "incl. shipping" line. Moving them to a per-model chunk would cost a request on opening a row.

## Equivalence check and the 84 old failures

`scripts/checks/data-equivalence.test.mts` compares the old list file (dip-filtered reduction in the old shape) with the new one (`decodeHist` + photo bitset): allTimeLow, week change, sale, photo, on the build day and the next. Result: ALL EQUAL, 0 failures.

The 84 "failures" that the script printed before this task came from another comparison: the scraper's FULL `history.json` against the list file's history, which has had the C6 implausible dips removed since commit f198493. They are differences by design (all-time low / week change without the dips), not regressions; the script now counts them apart ("C6 dip differences") and they never count as failures.

## File names

The new format is `/data/<cat>/list.v2.json` (field `v: 2`, checked by the decoder). The build never writes the new format as `list.json`; it writes no `list.json` at all. Code cached from before this change asks for `list.json` and gets a 404 (error state) instead of a file it cannot read.
