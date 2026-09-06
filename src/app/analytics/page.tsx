'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EditorialHeadline } from '@/components/editorial/EditorialHeadline';
import { DataValue } from '@/components/editorial/DataValue';
import { InvisibleTable, Column } from '@/components/editorial/InvisibleTable';
import { EditorialChart } from '@/components/editorial/EditorialChart';
import { MagneticButton } from '@/components/editorial/MagneticButton';
import { LenisProvider } from '@/components/editorial/LenisProvider';
import { ArrowLeft, Calendar, Filter, Sparkles, Download, Layers } from 'lucide-react';

interface HourlyMetric {
  id: string;
  hour: string;
  solarKw: number;
  windKw: number;
  totalGenKw: number;
  campusLoadKw: number;
  exportKw: number;
  tariffRate: string;
  savingsInr: number;
}

const analyticsData: HourlyMetric[] = [
  { id: '1', hour: '08:00', solarKw: 180, windKw: 110, totalGenKw: 290, campusLoadKw: 280, exportKw: 10, tariffRate: '₹4.50', savingsInr: 1305 },
  { id: '2', hour: '09:00', solarKw: 240, windKw: 125, totalGenKw: 365, campusLoadKw: 310, exportKw: 55, tariffRate: '₹5.20', savingsInr: 1898 },
  { id: '3', hour: '10:00', solarKw: 290, windKw: 130, totalGenKw: 420, campusLoadKw: 315, exportKw: 105, tariffRate: '₹6.10', savingsInr: 2562 },
  { id: '4', hour: '11:00', solarKw: 315, windKw: 132, totalGenKw: 447, campusLoadKw: 320, exportKw: 127, tariffRate: '₹6.80', savingsInr: 3039 },
  { id: '5', hour: '12:00', solarKw: 321, windKw: 136, totalGenKw: 457, campusLoadKw: 321, exportKw: 45,  tariffRate: '₹7.50', savingsInr: 3413 }, // Current
  { id: '6', hour: '13:00', solarKw: 310, windKw: 140, totalGenKw: 450, campusLoadKw: 330, exportKw: 120, tariffRate: '₹7.50', savingsInr: 3375 },
  { id: '7', hour: '14:00', solarKw: 280, windKw: 145, totalGenKw: 425, campusLoadKw: 340, exportKw: 85,  tariffRate: '₹7.20', savingsInr: 3060 },
  { id: '8', hour: '15:00', solarKw: 230, windKw: 155, totalGenKw: 385, campusLoadKw: 335, exportKw: 50,  tariffRate: '₹6.50', savingsInr: 2502 },
];

export default function AnalyticsDeepDivePage() {
  const [granularity, setGranularity] = useState<'15m' | '1h' | '1d'>('1h');
  const [activeMetric, setActiveMetric] = useState<'all' | 'solar' | 'wind'>('all');

  const columns: Column<HourlyMetric>[] = [
    {
      key: 'hour',
      header: 'Time',
      render: (item) => (
        <span className="font-editorial-mono font-medium text-xs text-[#111213]">
          {item.hour}
        </span>
      ),
    },
    {
      key: 'solarKw',
      header: 'Solar (kW)',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono text-xs text-[#C65D3A]">
          {item.solarKw}
        </span>
      ),
    },
    {
      key: 'windKw',
      header: 'Wind (kW)',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono text-xs text-[#006D77]">
          {item.windKw}
        </span>
      ),
    },
    {
      key: 'exportKw',
      header: 'Export (kW)',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono text-xs text-[#111213]">
          {item.exportKw}
        </span>
      ),
    },
    {
      key: 'savingsInr',
      header: 'Savings (₹)',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono text-xs text-[#111213] font-medium">
          ₹{item.savingsInr.toLocaleString('en-IN')}
        </span>
      ),
    },
  ];

  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#FAF9F6] text-[#111213] font-editorial-sans selection:bg-[#C65D3A]/20 selection:text-[#111213] pt-6 pb-24 px-4 sm:px-8 lg:px-16 max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <header className="flex items-center justify-between py-6 border-b border-[#E8E4DD]">
          <div className="flex items-center gap-3">
            <Link
              href="/editorial"
              className="inline-flex items-center gap-1.5 font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#787878] hover:text-[#111213] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Executive Dashboard
            </Link>
            <span className="text-[#E8E4DD]">/</span>
            <span className="font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#C65D3A] font-semibold">
              Analytics Deep Dive
            </span>
          </div>

          <div className="flex items-center gap-3">
            <MagneticButton
              variant="ghost"
              onClick={() => window.print()}
            >
              <Download className="w-3.5 h-3.5" />
              Export Dossier
            </MagneticButton>
          </div>
        </header>

        {/* ── Page Title ── */}
        <div className="pt-12 pb-8 border-b border-[#E8E4DD]">
          <p className="font-editorial-sans text-xs uppercase tracking-[0.2em] text-[#787878] font-medium mb-3">
            Multi-Campus SCADA Telemetry Archive
          </p>
          <EditorialHeadline level="h1">
            Empirical Energy Flow Analysis
          </EditorialHeadline>
        </div>

        {/* ── Sticky Toolbar ── */}
        <div className="sticky top-0 bg-[#FAF9F6]/95 backdrop-blur-md z-20 py-4 border-b border-[#E8E4DD] flex flex-wrap items-center justify-between gap-4">
          {/* Granularity Picker */}
          <div className="flex items-center gap-1 border border-[#E8E4DD] p-1 bg-[#FAF9F6]">
            {(['15m', '1h', '1d'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 text-xs font-editorial-sans uppercase tracking-wider transition-colors cursor-pointer ${
                  granularity === g
                    ? 'bg-[#111213] text-[#FAF9F6]'
                    : 'text-[#787878] hover:text-[#111213]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Metric Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#787878] font-editorial-sans">Filter Layer:</span>
            {(['all', 'solar', 'wind'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`px-3 py-1 text-xs font-editorial-sans uppercase tracking-wider border transition-colors cursor-pointer ${
                  activeMetric === m
                    ? 'border-[#C65D3A] text-[#C65D3A]'
                    : 'border-[#E8E4DD] text-[#787878] hover:border-[#111213]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Split Pane (Chart 70% | Stats Table 30%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-12 border-b border-[#E8E4DD]">
          {/* Chart Pane (70% - 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-end justify-between pb-2 border-b border-[#E8E4DD]">
              <h3 className="font-editorial-serif text-lg text-[#111213]">
                Microgrid Generation & Intermittency Contour
              </h3>
              <span className="font-editorial-mono text-xs text-[#787878]">kW vs Time</span>
            </div>
            <EditorialChart height={360} primaryKey="solar" secondaryKey="wind" />
          </div>

          {/* Stats Table Pane (30% - 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-end justify-between pb-2 border-b border-[#E8E4DD]">
              <h3 className="font-editorial-serif text-lg text-[#111213]">
                Hourly Audit Table
              </h3>
              <span className="font-editorial-mono text-xs text-[#787878]">Today</span>
            </div>
            <InvisibleTable columns={columns} data={analyticsData} />
          </div>
        </div>

        {/* ── AI Insights Panel (Kinfolk Editorial Narrative) ── */}
        <div className="pt-12">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-2 text-xs font-editorial-sans uppercase tracking-[0.2em] text-[#C65D3A] font-semibold">
              <Sparkles className="w-4 h-4" />
              Kinfolk SCADA Editorial Synthesis
            </div>
            <EditorialHeadline level="h2">
              The Midday Solar Arbitrage &amp; Evening Duck Curve Transition
            </EditorialHeadline>
            <p className="text-sm sm:text-base text-[#787878] leading-relaxed">
              Between 11:00 and 13:00 IST, peak irradiance in western Rajasthan generated a combined 457 kW output against an academic base load of 321 kW. Instead of uncompensated curtailment, 45 kW was routed into the state grid interconnect at a spot feed-in tariff of ₹7.50/kWh, yielding ₹3,413 in hourly system savings.
            </p>
            <p className="text-sm sm:text-base text-[#787878] leading-relaxed">
              As solar insolation declines entering the 18:00 evening duck curve peak, the RTU Kota 500 kWh BESS storage will discharge at a controlled 120 kW rate, shielding campus infrastructure from ₹8.20/kWh peak grid penalties.
            </p>
          </div>
        </div>
      </div>
    </LenisProvider>
  );
}
