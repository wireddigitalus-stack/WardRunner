import Link from 'next/link';
import { MapPin, BarChart3, ShieldCheck, Zap, ArrowRight, Layers } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl">
            WR
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">WardRunner</h1>
            <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">Field Logistics & Yard Sign Intel</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full">
          v1.0 Production
        </span>
      </header>

      {/* Main Hero & Campaign Context */}
      <main className="my-auto py-10 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Pilot Campaign: Melissa K. Brown for Bristol TN City Council
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Yard sign intelligence for campaigns that refuse to overpay.
          </h2>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl">
            Down-ballot races cannot afford $1,000+/mo legacy voter databases. WardRunner delivers a sub-10-second mobile tool for volunteers and complete visibility over territory coverage and competitor placements.
          </p>
        </div>

        {/* Action Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <Link
            href="/field"
            className="group p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition">
                Field Volunteer App
              </h3>
              <p className="text-sm text-slate-400">
                Frictionless PIN login, sub-10s one-tap GPS sign drop, camera capture with auto-compression, and post-election cleanup retrieval mode.
              </p>
            </div>
            <div className="mt-6 flex items-center text-emerald-400 font-bold text-sm gap-2">
              Launch /field <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition">
                Manager Command
              </h3>
              <p className="text-sm text-slate-400">
                Built for Operations Lead Allen Hurley: Clustered map markers, competitor reconnaissance, Bristol AADT traffic corridors, and CSV/GeoJSON export.
              </p>
            </div>
            <div className="mt-6 flex items-center text-blue-400 font-bold text-sm gap-2">
              Launch /dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-center">
          <div className="p-3">
            <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="font-bold text-xs text-white">&lt; 10s Log Time</p>
            <p className="text-[11px] text-slate-500">Fast thumb ergonomics</p>
          </div>
          <div className="p-3">
            <Layers className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="font-bold text-xs text-white">PostGIS Enabled</p>
            <p className="text-[11px] text-slate-500">Spatial radius & boundaries</p>
          </div>
          <div className="p-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="font-bold text-xs text-white">Competitor Intel</p>
            <p className="text-[11px] text-slate-500">Track opposition density</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
        WardRunner • Melissa K. Brown for Bristol TN City Council • Powered by Supabase & Next.js
      </footer>
    </div>
  );
}
