# Glossary — one word per concept (C8)

Every visible string comes from `src/lib/i18n.ts` (`Text` = `{el, en}`). When two words could name the same thing, the site uses the one below everywhere. Started at Phase 1 Stop 2 (2026-10-04); extended at Stop 3 and in later phases.

**Register (owner, 2026-10-05): Greek speaks to the visitor in the singular, "εσύ", everywhere** — as the plan does ("Φτιάξε PC", "Δες"): "Διάλεξε επεξεργαστή", "Έλεγξε τη σύνδεσή σου", "Μπορείς να το αναιρέσεις", "Τα δικαιώματά σου". Never the polite plural ("Διαλέξτε", "σας", "Μπορείτε"). Gender-neutral wording where a form would need a gender ("τα διαγράφεις εσύ", not "μόνος σου").

| Concept | Ελληνικά | English | Notes |
| --- | --- | --- | --- |
| The builder tool | **PC Builder** | **PC Builder** | The tool's name in both languages (owner, 2026-10-04). Not "Συναρμολόγηση PC" (v1). |
| A site we read prices from (Skroutz, BestPrice, Snif, Shopflix, e-shop.gr) | πηγή / πηγές | source / sources | Never "κατάστημα" for these: three of them are comparison sites (UX-04). |
| The shop that actually sells (Plaisio, Kotsovolos…) | κατάστημα | shop | "Plaisio, μέσω Skroutz" / "Plaisio, via Skroutz". |
| A shop's offer for one product | προσφορά τιμής | offer | Not "προσφορά" alone when it could mean a discount (see below). |
| A price below its usual level, marked by the source | έκπτωση (−N%) | discount (−N%) | The badge shows "−12%". |
| The deals page (later, Phase 5) | Προσφορές | Deals | Menu label once the page exists. |
| What we group listings into | μοντέλο | model | E.g. RTX 5070 12GB. |
| One specific product (a card, a kit) | προϊόν | product | Graphics cards only, after Phase 2. |
| The 9 categories, as a group | Εξαρτήματα | Parts | Menu button and `/parts`. |
| Categories | Επεξεργαστές, Μητρικές, Μνήμη RAM, Κάρτες γραφικών, Δίσκοι, Κουτιά, Τροφοδοτικά, Ψύκτρες CPU, Ανεμιστήρες | Processors, Motherboards, Memory (RAM), Graphics cards, Storage, Cases, Power supplies, CPU coolers, Case fans | Same names in the menu, tiles, breadcrumbs and page titles. |
| One part in the builder (slot) | Επεξεργαστής, Μητρική, Μνήμη RAM, Κάρτα γραφικών, Δίσκος, Κουτί, Τροφοδοτικό, Ψύκτρα CPU, Ανεμιστήρες | Processor, Motherboard, Memory, Graphics card, Storage drive, Case, Power supply, CPU cooler, Case fans | `CATS[cat].one` in `src/shell/nav.ts`. |
| Count of models | 1 μοντέλο / 96 μοντέλα | 1 model / 96 models | Tiles and menu. |
| Reset every filter | Καθαρισμός φίλτρων | Clear filters | One label for every reset (UX-17): the sidebar's reset, the sheet's, the applied-filter row's and the empty state's. |
| Modular PSU cables | Πλήρως αρθρωτό / Ημι-αρθρωτό / Μη αρθρωτό | Fully modular / Semi-modular / Non-modular | Filter label "Αρθρωτά καλώδια" (UX-22). |
| RAM sticks in a kit | 2 τεμάχια (σετ) | 2 × stick (kit) | Not "kit" / "module" in Greek (UX-22). |
| RAM latency | Καθυστέρηση CL | Latency | (UX-22) |
| Remove one applied filter | Αφαίρεση φίλτρου «…» | Remove filter "…" | Screen-reader label of the chip's "×". |
| Price with delivery | τιμή με μεταφορικά | price with shipping | Only when the shipping belongs to the same offer (P-01). |
| Delivery cost | μεταφορικά | shipping | Unknown: **"Μεταφορικά: άγνωστα" / "Shipping: unknown"** (owner 2026-10-05: "Χωρίς μεταφορικά" reads as free shipping); free: "Δωρεάν μεταφορικά" / "Free shipping"; a total without delivery: "τα μεταφορικά δεν περιλαμβάνονται" / "shipping not included". |
| In stock / availability | διαθεσιμότητα | availability | Shown only when known (Phase 2). |
| When a price was read | ελέγχθηκε πριν από … | checked … ago | Older than 24 h is marked ⚠. |
| Change over 7 days | 7 ημέρες | 7 days | Always labelled (UX-24): "−4% σε 7 ημέρες". |
| Compatibility: error | Ασύμβατο | Incompatible | Red, ✕ icon. |
| Compatibility: warning | Θέλει προσοχή | Needs attention | Orange, ⚠ icon: the user has to act. |
| Compatibility: note (estimate) | Πιθανότατα χωράει | Likely fits | Light blue, ⓘ icon (decision after Phase 0). |
| Compatibility: note (data missing) | Δεν επιβεβαιώθηκε | Not verified | Light blue, ⓘ icon. |
| Compatibility: pass | Συμβατό | Compatible | Green, ✓ icon. |
| Compatibility: pass for space checks | Χωράει | Fits | Only for lengths, heights and sizes (UX-44). |
| Retry after an error | Δοκιμή ξανά | Try again | Error states (UX-19). |
| Search box | Αναζήτηση | Search | Placeholder "π.χ. RTX 5070, 990 Pro" / "e.g. RTX 5070, 990 Pro". |
| Home | Αρχική | Home | Breadcrumbs. |
| Skip link | Μετάβαση στο περιεχόμενο | Skip to content | First Tab stop (UX-05). |

**Plurals** come from one helper (`Intl.PluralRules`), never by hand: "1 εξάρτημα / 3 εξαρτήματα", "1 ασύμβατο / 2 ασύμβατα" (UX-47).
