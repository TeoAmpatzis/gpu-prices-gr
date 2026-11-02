# BuildDraft v2.0 Evolution & Architecture Report

> **Comprehensive overview of architectural improvements, compatibility engineering, and user experience advancements from v1.0 to v2.0.**

---

## 1. Executive Summary

**BuildDraft.gr** is an automated PC hardware pricing aggregator and custom PC assembly platform for the Greek retail market. It indexes listings from major retailers and marketplaces—including **Skroutz, BestPrice, Shopflix, Snif, and e-shop.gr**—providing live price comparisons, shipping fee calculations, historical price charting, and hardware compatibility checks.

Version 2.0 represents a complete architectural overhaul. While v1.0 laid the groundwork for price collection and basic parts listing, v2.0 transforms BuildDraft into an industrial-grade web application featuring:
- A deterministic **Hardware Compatibility Engine** (30 validation rules with official hardware vendor matrices).
- A **Dual-Mode PC Builder** (Guided Walkthrough for beginners & Freeform Workbench for enthusiasts).
- Robust **Data Cleansing & Normalization** with `SAFER` bounds and automated glitch protection.
- Extreme frontend performance (**Sub-100 KB gzip initial JS**, **CLS = 0**, **Lighthouse 95–100**).
- Zero-database, static-edge deployment running on **GitHub Actions & Vercel Edge CDN**.

---

## 2. Feature & Architectural Comparison (v1 vs v2)

| Dimension | BuildDraft v1.0 | BuildDraft v2.0 |
| :--- | :--- | :--- |
| **Compatibility Engine** | Basic client-side filters (socket matching only) | **30 Deterministic Rules** covering physical dimensions, power curves, memory speeds, VRM/chipset BIOS, M.2/SATA lanes, and radiator clearances. |
| **PC Builder Experience** | Single rigid linear step-by-step form | **Dual-Mode System**: Guided intent/budget builder + Freeform Part List Workbench with live feedback. |
| **Recommendation System** | Simple price sorting | **Dynamic Tiered Recommendations** based on target budget, use case (Gaming/Workstation/Office), and balance scoring. |
| **Component Specifications** | Unchecked raw strings from retailer titles | **Rigorous Data Validation (`enforce`)**: Rejects out-of-bounds scraped specs; resolves conflicting multi-source data. |
| **Power Consumption** | Simple wattage summation | **Accurate System Load Modeling**: GPU board power tables + CPU PL2/PPT bounds + safety headroom calculation. |
| **State & Build Sharing** | Ephemeral URL hashes with limited state | **Compressed URL Encoding** (`/builder?b=...`), resilient local storage auto-save, and forum/Markdown export. |
| **Bundle Architecture** | Single monolithic JS bundle with large JSON dumps | **Progressive Edge Chunks**: Category slices, model chunks mod 256 (<25 KB gzip), and lazy-loaded builder code. |
| **Performance (Mobile)** | Variable (80–89 Lighthouse, paint blocking) | **Lighthouse 95–100**, CLS = 0, first paint under 100 KB critical footprint. |
| **Test Coverage** | Smoke checks only | **1,440+ Unit & Scenario Tests** across 55 test suites, 81 engine compatibility benchmark scenarios (0 failures). |
| **UI & Theme** | Dual theme with styling discrepancies | **Refined Dark-First Identity**: Custom typography, responsive 360px mobile to 4K desktop, bilingual EN/EL. |

---

## 3. Visual Evolution (v1 vs v2 Showcase)

Below are representative side-by-side screenshots demonstrating the generational leap in UI, information architecture, and user workflows.

### 3.1 Component Catalog & Hardware Filtering

| Version 1.0 (Legacy Catalog) | Version 2.0 (Modern Catalog) |
| :---: | :---: |
| ![v1 GPU Catalog](assets/v1/01-v1-gpu-listings.jpg) | ![v2 Guided Setup](assets/v2/01-v2-guided-builder-setup.jpg) |
| *v1 featured dense, unformatted tables with basic text filtering.* | *v2 introduces streamlined facet chips, live availability badges, and fast search.* |

### 3.2 PC Builder & Recommendation Engine

| Version 1.0 (Rigid Form Flow) | Version 2.0 (Smart Recommendations) |
| :---: | :---: |
| ![v1 Builder Flow](assets/v1/03-v1-builder-flow.jpg) | ![v2 Guided Recommendations](assets/v2/02-v2-guided-recommendations.jpg) |
| *v1 forced linear selection without contextual price/power guidance.* | *v2 offers real-time compatibility badges, price alerts, and budget allocation guidance.* |

### 3.3 Freeform Workbench & Comprehensive Compatibility Review

| Version 1.0 (Summary Table) | Version 2.0 (Deep Compatibility & Part List) |
| :---: | :---: |
| ![v1 Summary](assets/v1/04-v1-builder-review.jpg) | ![v2 Compatibility Review](assets/v2/04-v2-compatibility-review.jpg) |
| *v1 had basic part listings with minimal hardware verification.* | *v2 performs 30 physical and electrical checks with shop breakdown and shipping fees.* |

---

## 4. Deep Dive: Key Technical Improvements

### 4.1 Hardware Compatibility Engine (Rules 1–30)
In v1.0, selecting an AM5 motherboard would still permit DDR4 memory if the retailer's title was mislabeled. v2.0 solves this via a declarative, test-driven compatibility engine (`src/engine/rules.ts`):
1. **Physical Clearances**:
   - GPU length vs. Case maximum clearance.
   - CPU Cooler height vs. Case maximum cooler clearance.
   - Motherboard form factor (E-ATX, ATX, Micro-ATX, Mini-ITX) vs. Case support.
   - Liquid cooling radiator dimensions (120/240/280/360 mm) vs. Case top/front mounting limits.
2. **Electrical & Power Safety**:
   - Official GPU TGP/TBP power tables + CPU PPT/PL2 power limits.
   - PSU wattage sufficiency check with 20% transient spike buffer.
   - ATX 3.0 / 3.1 & PCIe 5.0 12V-2x6 / 12VHPWR connector verification for high-wattage GPUs (RTX 40/50 series).
   - Case PSU form factor clearance (SFX vs. ATX vs. SFX-L).
3. **Architecture & Chipsets**:
   - CPU socket vs. Motherboard socket (AM4, AM5, LGA1700, LGA1851, etc.).
   - Chipset generational compatibility and BIOS flashback warnings for un-updated boards.
   - Official memory generation (DDR4 vs. DDR5) and CPU native memory controller speed limits.
   - Storage bus matching (M.2 NVMe PCIe 3.0/4.0/5.0 vs. SATA 2.5" bays).

### 4.2 Data Pipeline & Normalization
The scraping system (`scraper/`) runs unattended on GitHub Actions every 6 hours:
- **`SAFER` Range Validation**: Outlier scraper results (e.g. 3,500 mm GPU clearance instead of 350 mm) are automatically clamped or marked unknown.
- **Product Aliasing & Disambiguation**: Merges different spellings of identical components across Greek retailers (e.g., "RTX 4070 SUPER" variations) while preserving historical price timelines.
- **Dual Merge Driver**: Git custom merge driver (`scraper/merge_history.py`) merges daily price history points without data loss during automated concurrent commits.

### 4.3 Static Edge Performance & Web Vitals
To maintain high responsiveness without paying for costly backend database instances:
- **Zero-DB Edge Distribution**: Scraped datasets compile into deterministic static JSON files served via Vercel Edge CDN with strict cache-control headers (`stale-while-revalidate`).
- **Chunked Loading**: Model details and price history are split into 256 hash-indexed chunks, ensuring clients download only the specific parts they view.
- **Critical Render Path**: Initial page load delivers only shell CSS and pre-computed index manifests; search indices and builder workers hydrate asynchronously.

---

## 5. Quality Assurance & Verification Metrics

- **Unit & Integration Tests**: 1,441 Vitest tests across 55 test files passing with 100% green status.
- **Compatibility Benchmark Scenarios**: 81 real-world scenarios tested against official hardware specifications (Pass: 63, Known Vendor Specification Gaps: 4, Unknown Spec: 14, Regressions/Failures: 0).
- **End-to-End Test Suite**: Comprehensive Playwright journeys testing navigation, build creation, share link restoration, responsive breakpoints (360px mobile, 1366px desktop), and reload recovery.
- **Core Web Vitals**:
  - First Contentful Paint (FCP): < 0.8s
  - Cumulative Layout Shift (CLS): **0.000**
  - Performance Score: **95–100** on both mobile and desktop.
