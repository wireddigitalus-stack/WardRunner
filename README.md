# WardRunner 🏃‍♂️📍

> **Fast, mobile-first field logistics and yard sign intelligence purpose-built for down-ballot political campaigns.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostGIS-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 Pilot Campaign Context
- **Candidate:** Melissa K. Brown for Bristol City Council
- **Political Operations Lead:** Allen Hurley
- **The Problem:** Down-ballot races cannot afford $1,000+/mo legacy voter databases (NGP VAN, Aristotle, NationBuilder). Field volunteers need a sub-10-second mobile tool to drop/retrieve yard signs from a car or sidewalk, while campaign directors need real-time territory coverage, corridor traffic analysis (AADT), and competitor intelligence.

---

## 🚀 Key Features

### 1. Mobile Volunteer PWA (`/field`)
- **Frictionless Login:** Quick 6-digit numeric PIN keypad + volunteer call sign saved in localStorage. Zero password or email verification fatigue.
- **Sub-10-Second "Drop Sign" Action:**
  - One-tap high-accuracy GPS acquisition (`navigator.geolocation` with ± accuracy meter).
  - 4-way ergonomic thumb selector: *Yard Sign*, *Large 4x4*, *Banner*, *Billboard*.
  - Competitor Reconnaissance switch (*Log Competitor Sign* with opposition candidate tag).
  - Native camera capture (`capture="environment"`) with client-side HTML5 canvas compression (<250KB WebP/JPEG) for fast upload over cellular/LTE.
  - Haptic feedback vibration + high-contrast confirmation banner.
- **Cleanup / Post-Election Retrieval Mode:**
  - Instant proximity sorting showing signs within sector radius (e.g. *45m away*, *120m away*).
  - One-tap "Mark Retrieved" button updating inventory and timestamps.

### 2. Manager Command Dashboard (`/dashboard`)
- **Interactive Geospatial Canvas:** Clustered sign visualization (Melissa Brown campaign signs in Emerald & Blue vs. competitor signs in Crimson).
- **Bristol Traffic Corridor Overlays (AADT):**
  - Route 229 (Middle St / ESPN Corridor: 28,900 AADT)
  - Route 6 (Farmington Ave: 24,500 AADT)
  - Route 72 (Pine St: 19,800 AADT)
- **Multi-Factor Filtering:** Sign type, active vs. retrieved status, placed by volunteer, and competitor tags.
- **Data Portability:** 1-click **CSV** and **GeoJSON** exports.

### 3. PostgreSQL + PostGIS Geospatial Engine
- PostGIS 4326 geometry point mapping with automated sync triggers.
- Row-Level Security (RLS) policies allowing field volunteers to insert/read with campaign PIN verification.
- Storage bucket configuration for compressed sign verification photos.
- Proximity search RPC (`get_nearby_signs`) using `ST_DWithin` and `ST_Distance`.

---

## 🛠️ Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/wireddigitalus-stack/WardRunner.git
cd WardRunner
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Supabase Database Migration
Execute the SQL script located in [`supabase/migrations/20260909000000_wardrunner_init.sql`](supabase/migrations/20260909000000_wardrunner_init.sql) in your Supabase SQL Editor. This will:
- Enable `postgis`.
- Create `campaigns` and `signs` tables with GIST spatial indexes and auto-sync triggers.
- Create the `sign-photos` storage bucket with public read/upload policies.
- Seed the pilot campaign (*Melissa K. Brown for Bristol City Council*, PIN: `246810`).

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000` to navigate the portal, or visit `/field` for the mobile volunteer app and `/dashboard` for the operations center.

---

## 📱 Mobile PWA Field Instructions
1. Navigate to `/field` on mobile Safari or Chrome.
2. Select **"Add to Home Screen"** to install as a standalone PWA.
3. Enter PIN: `246810` and your name.
4. Tap **"DROP OUR SIGN HERE"** at each placement location.

---

## 📄 License
MIT License. Built for grassroots democracy.
