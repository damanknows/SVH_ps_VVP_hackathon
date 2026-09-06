'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EditorialHeadline } from '@/components/editorial/EditorialHeadline';
import { MetricCard } from '@/components/editorial/MetricCard';
import { InvisibleTable, Column } from '@/components/editorial/InvisibleTable';
import { EditorialChart } from '@/components/editorial/EditorialChart';
import { DataValue } from '@/components/editorial/DataValue';
import { MagneticButton } from '@/components/editorial/MagneticButton';
import { LenisProvider } from '@/components/editorial/LenisProvider';
import { ArrowLeft, ExternalLink, Sparkles, Wind, Sun, Battery, ArrowUpRight } from 'lucide-react';

interface FleetAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  outputKw: number;
  capacityKw: number;
  healthPct: number;
  status: 'Optimal' | 'Dispatching' | 'Standby';
}

const fleetData: FleetAsset[] = [
  { id: 'raj-solar-01', name: 'Jodhpur Solar Array Alpha', type: 'Solar PV', location: 'MBM University, Jodhpur', outputKw: 321, capacityKw: 400, healthPct: 98.6, status: 'Dispatching' },
  { id: 'raj-wind-01',  name: 'Jaisalmer Wind Turbine #2', type: 'Wind HAWT', location: 'Engineering College Bikaner', outputKw: 136, capacityKw: 200, healthPct: 99.1, status: 'Dispatching' },
  { id: 'raj-bess-01',  name: 'Kota BESS Storage Facility', type: 'LiFePO4 BESS', location: 'RTU Kota Campus', outputKw: 0, capacityKw: 500, healthPct: 97.4, status: 'Standby' },
  { id: 'raj-solar-02', name: 'Jaipur Rooftop Micro-Array', type: 'BIPV Solar', location: 'Govt Polytechnic Jaipur', outputKw: 78, capacityKw: 100, healthPct: 95.8, status: 'Optimal' },
];

export default function EditorialExecutiveDashboard() {
  const columns: Column<FleetAsset>[] = [
    {
      key: 'name',
      header: 'Asset Identity',
      render: (item) => (
        <div>
          <span className="font-editorial-serif font-medium text-sm text-[#111213] group-hover:text-[#C65D3A] transition-colors">
            {item.name}
          </span>
          <p className="font-editorial-sans text-[11px] text-[#787878] mt-0.5">
            {item.location} · {item.type}
          </p>
        </div>
      ),
    },
    {
      key: 'outputKw',
      header: 'Active Yield',
      align: 'right',
      render: (item) => (
        <div>
          <span className="font-editorial-mono font-medium text-sm text-[#111213]">
            {item.outputKw} kW
          </span>
          <span className="block text-[10px] text-[#787878] font-editorial-sans">
            of {item.capacityKw} kW cap
          </span>
        </div>
      ),
    },
    {
      key: 'healthPct',
      header: 'SCADA Health',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono text-sm text-[#006D77]">
          {item.healthPct}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'State',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 font-editorial-sans text-xs uppercase tracking-wider text-[#787878]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'Dispatching'
                ? 'bg-[#C65D3A]'
                : item.status === 'Optimal'
                ? 'bg-[#006D77]'
                : 'bg-[#787878]'
            }`}
          />
          {item.status}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (item) => (
        <Link href={`/assets/${item.id}`} className="text-[#787878] hover:text-[#C65D3A] transition-colors">
          <ArrowUpRight className="w-4 h-4 inline-block" />
        </Link>
      ),
    },
  ];

  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#FAF9F6] text-[#111213] font-editorial-sans selection:bg-[#C65D3A]/20 selection:text-[#111213] pt-6 pb-24 px-4 sm:px-8 lg:px-16 max-w-[1400px] mx-auto">
        {/* ── Top Navigation Bar (Quiet Luxury) ── */}
        <header className="flex items-center justify-between py-6 border-b border-[#E8E4DD]">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#787878] hover:text-[#111213] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Command Bridge
            </Link>
            <span className="text-[#E8E4DD]">/</span>
            <span className="font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#C65D3A] font-medium">
              Kinfolk SCADA Editorial
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/analytics">
              <MagneticButton variant="ghost">Analytics Deep Dive</MagneticButton>
            </Link>
            <Link href="/assets/raj-solar-01">
              <MagneticButton variant="primary">Asset Detail View</MagneticButton>
            </Link>
          </div>
        </header>

        {/* ── SECTION 1: Full-Screen Hero (Headline + Narrative) ── */}
        <section className="py-16 sm:py-24 border-b border-[#E8E4DD]">
          <p className="font-editorial-sans text-xs uppercase tracking-[0.24em] text-[#C65D3A] font-semibold mb-6">
            Executive Briefing · Directorate of Technical Education, Rajasthan
          </p>

          <EditorialHeadline level="display-xl" splitLines={true}>
            {`Autonomous Microgrid\nOrchestration at Scale.`}
          </EditorialHeadline>

          <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-[#787878] text-sm sm:text-base leading-relaxed font-normal">
            <p className="md:col-span-2">
              Across seven state polytechnic campuses, generation curves from high-irradiance solar arrays and Thar Desert wind turbines are dynamically balanced in real time against critical academic loads, ensuring zero uncompensated curtailment.
            </p>
            <div className="flex flex-col justify-end border-l border-[#E8E4DD] pl-6 font-editorial-mono text-xs">
              <span className="text-[#111213] font-medium">SCADA Heartbeat: 12:00 IST</span>
              <span className="text-[#787878] mt-1">Optimization: Active (P10-P90)</span>
            </div>
          </div>

          {/* Inline Metric Cards (Zero border, zero shadow) */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-[#E8E4DD]">
            <MetricCard
              label="Microgrid Autonomy"
              value="82.4"
              unit="%"
              trend="up"
              trendValue="+4.2%"
              context="Self-reliant solar & wind dispatch"
              sparklineData={[70, 72, 75, 74, 78, 80, 81, 82.4]}
            />
            <MetricCard
              label="Hourly Savings"
              value="₹3,413"
              unit="/hr"
              trend="up"
              trendValue="₹410"
              context="Avoided peak grid tariff import"
              sparklineData={[2800, 2900, 3100, 3050, 3200, 3350, 3413]}
            />
            <MetricCard
              label="Active Generation"
              value="395"
              unit="kW"
              trend="up"
              trendValue="457 kW cap"
              context="321 kW Solar + 136 kW Wind"
              sparklineData={[120, 180, 250, 310, 360, 385, 395]}
            />
            <MetricCard
              label="Grid Interconnect"
              value="45"
              unit="kW export"
              trend="down"
              trendValue="-5 kW"
              context="Surplus exported to Rajasthan Discom"
              sparklineData={[10, 15, 25, 30, 40, 48, 45]}
            />
          </div>
        </section>

        {/* ── SECTION 2: Production vs Duck Curve Forecast ── */}
        <section className="py-16 sm:py-20 border-b border-[#E8E4DD]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#787878] mb-1">
                Dispatch Trajectory
              </p>
              <EditorialHeadline level="h2">
                Generation Yield vs. Net Demand
              </EditorialHeadline>
            </div>
            <div className="flex items-center gap-6 font-editorial-sans text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C65D3A]" />
                Solar Yield (321 kW)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006D77]" />
                Wind Yield (136 kW)
              </span>
            </div>
          </div>

          <EditorialChart height={340} />
        </section>

        {/* ── SECTION 3: Fleet Health (Invisible Table) ── */}
        <section className="py-16 sm:py-20 border-b border-[#E8E4DD]">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#787878] mb-1">
                Asset Inventory
              </p>
              <EditorialHeadline level="h2">
                Campus Generation & Storage Fleet
              </EditorialHeadline>
            </div>
            <span className="font-editorial-mono text-xs text-[#787878]">
              4 Synchronized Units
            </span>
          </div>

          <InvisibleTable columns={columns} data={fleetData} />
        </section>

        {/* ── SECTION 4: Market Context & AI Narrative ── */}
        <section className="py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#C65D3A] font-semibold">
              SCADA Editorial Synthesis
            </p>
            <EditorialHeadline level="h3">
              Pre-Cooling Protocol Activated Ahead of 14:00 Peak Tariff Window
            </EditorialHeadline>
            <p className="text-sm text-[#787878] leading-relaxed">
              With ambient campus solar irradiation plateauing at 321 kW and the RTU Kota BESS reaching 82.4% state of charge, the dispatch optimizer has scheduled 124 kW of critical HVAC pre-cooling. This preemptive load dispatch eliminates ₹4,200 in projected peak tariff surcharge from the state grid interconnect.
            </p>
          </div>

          <div className="border-l border-[#E8E4DD] pl-8 space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#787878] mb-1">
                Spot Discom Clearing
              </p>
              <DataValue value="₹6.40" unit="/kWh" trend="up" trendValue="+₹0.80" size="lg" align="left" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#787878] mb-1">
                Avoided Scope 2 Emissions
              </p>
              <DataValue value="2.84" unit="tons CO2e" trend="up" trendValue="+0.3" size="lg" align="left" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#787878] mb-1">
                Grid Frequency Stabilization
              </p>
              <DataValue value="50.02" unit="Hz" trend="neutral" size="lg" align="left" />
            </div>
          </div>
        </section>
      </div>
    </LenisProvider>
  );
}
