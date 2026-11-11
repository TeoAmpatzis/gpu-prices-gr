# Changelog

All notable changes to **BuildDraft.gr** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-02

### 🚀 Major Highlights
Version 2.0.0 is a complete reimagining of BuildDraft.gr, introducing a deterministic hardware compatibility engine, a dual-mode PC builder, refined static edge delivery, and sub-second performance across mobile and desktop.

### Added
- **Deterministic Hardware Compatibility Engine (`src/engine/`, rules in `src/engine/rules/*.ts`)**:
  - Implemented 30 rigorous physical, architectural, and electrical verification rules.
  - Sourced official manufacturer specification tables for CPU PPT/PL2 power limits, GPU board power, memory controller speeds, and motherboard BIOS revisions.
  - Added 81 automated regression test scenarios verifying full compatibility suites.
- **Dual-Mode PC Builder**:
  - **Guided Walkthrough Mode**: Step-by-step assembly tailored to target budgets and use-cases (Gaming, Workstation, Office) with dynamic component balance recommendations.
  - **Freeform Workbench Mode**: Flexible Part List editor for experienced builders with instant compatibility feedback, total wattage estimation, and multi-store shipping tally.
- **Build Sharing & Persistence**:
  - Stateless build sharing via URL query encoding (`/builder?v=2&cpu=…`, one parameter per part).
  - Automatic build state persistence in browser `localStorage`.
  - Instant one-click Markdown list copy formatted for forums, Reddit, and Discord.
- **Data Hardening & Validation**:
  - Enforced `SAFER` bounds to reject corrupted scraper records before bundle compilation.
  - Product alias disambiguation engine uniting disparate Greek retailer naming conventions.
  - Automated detection of historical price drops and retailer promotional tags.
- **Asset Evolution & Documentation**:
  - Curated v1 vs v2 legacy archive showcasing generational UI and UX improvements (`docs/assets/`).
  - Comprehensive architectural overview and migration report (`docs/v1-to-v2-evolution.md`).

### Changed
- **Frontend Architecture**:
  - Migrated to modular hash-indexed model chunks (mod 256) under 25 KiB gzip each, eliminating massive single-file client downloads.
  - Decoupled builder engine computation into web workers and deferred hydration paths to guarantee First Contentful Paint < 0.8s.
  - Achieved Cumulative Layout Shift (CLS) of 0.000 across all routes.
- **Design System & UX**:
  - Refined modern dark-first aesthetic with bespoke typography, subtle borders, and accessible high-contrast focus rings.
  - 100% responsive fluid layout optimized from 360px mobile viewports to ultrawide 4K displays.
  - Fully bilingual interface (Greek & English) across all product chips, badges, and system notifications.

### Fixed
- Fixed motherboard dimension parsing errors for Mini-ITX boards with 'M' chipset designations.
- Fixed RAM short titles retaining orphaned module count digits.
- Corrected power supply clearance miscalculations for compact SFF/Mini-ITX cases.
- Resolved race conditions during simultaneous asynchronous builder model hydration.

---

## [1.0.0] - 2026-09-30

### Initial Release
- Automated price scraping from Greek retailers (Skroutz, BestPrice, Shopflix, Snif, e-shop.gr).
- Nine PC component categories: GPU, CPU, Motherboard, RAM, Storage, PSU, Case, Fan, Cooler.
- 6-hour automated price sync via GitHub Actions and static JSON generation.
- Basic parts listing and price comparison table.
- Initial single-path PC builder prototype.
