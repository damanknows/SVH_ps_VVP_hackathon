'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { EditorialHeadline } from '@/components/editorial/EditorialHeadline';
import { DataValue } from '@/components/editorial/DataValue';
import { InvisibleTable, Column } from '@/components/editorial/InvisibleTable';
import { EditorialChart } from '@/components/editorial/EditorialChart';
import { MagneticButton } from '@/components/editorial/MagneticButton';
import { LenisProvider } from '@/components/editorial/LenisProvider';
import { ArrowLeft, Sun, Wind, Battery, Thermometer, ShieldCheck, Zap, Activity } from 'lucide-react';

interface InverterTelemetry {
  id: string;
  stringName: string;
  voltageV: number;
  currentA: number;
  powerKw: number;
  tempC: number;
  status: 'Nominal' | 'Alert';
}

const inverterRows: InverterTelemetry[] = [
  { id: 'inv-01', stringName: 'String Inverter Alpha-01', voltageV: 680, currentA: 118, powerKw: 80.2, tempC: 44.2, status: 'Nominal' },
  { id: 'inv-02', stringName: 'String Inverter Alpha-02', voltageV: 678, currentA: 119, powerKw: 80.6, tempC: 45.1, status: 'Nominal' },
  { id: 'inv-03', stringName: 'String Inverter Alpha-03', voltageV: 682, currentA: 117, powerKw: 79.8, tempC: 43.8, status: 'Nominal' },
  { id: 'inv-04', stringName: 'String Inverter Alpha-04', voltageV: 676, currentA: 120, powerKw: 80.4, tempC: 46.0, status: 'Nominal' },
];

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assetId = resolvedParams.id || 'raj-solar-01';

  const tableColumns: Column<InverterTelemetry>[] = [
    {
      key: 'stringName',
      header: 'Sub-Unit / Inverter',
      render: (item) => (
        <span className="font-editorial-serif font-medium text-sm text-[#111213]">
          {item.stringName}
        </span>
      ),
    },
    {
      key: 'voltageV',
      header: 'Bus Voltage',
      align: 'right',
      render: (item) => `${item.voltageV} V`,
    },
    {
      key: 'currentA',
      header: 'DC Current',
      align: 'right',
      render: (item) => `${item.currentA} A`,
    },
    {
      key: 'powerKw',
      header: 'Active kW',
      align: 'right',
      render: (item) => (
        <span className="font-editorial-mono font-medium text-[#C65D3A]">
          {item.powerKw} kW
        </span>
      ),
    },
    {
      key: 'tempC',
      header: 'Core Temp',
      align: 'right',
      render: (item) => `${item.tempC} °C`,
    },
    {
      key: 'status',
      header: 'Health',
      align: 'center',
      render: (item) => (
        <span className="inline-flex items-center gap-1 font-editorial-sans text-[11px] text-[#006D77] uppercase tracking-wider font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006D77]" />
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#FAF9F6] text-[#111213] font-editorial-sans selection:bg-[#C65D3A]/20 selection:text-[#111213] pt-6 pb-24 px-4 sm:px-8 lg:px-16 max-w-[1400px] mx-auto">
        {/* ── Sticky Top Bar ── */}
        <header className="sticky top-0 bg-[#FAF9F6]/95 backdrop-blur-md z-30 flex items-center justify-between py-6 border-b border-[#E8E4DD]">
          <div className="flex items-center gap-3">
            <Link
              href="/editorial"
              className="inline-flex items-center gap-1.5 font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#787878] hover:text-[#111213] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Fleet Overview
            </Link>
            <span className="text-[#E8E4DD]">/</span>
            <span className="font-editorial-sans text-xs uppercase tracking-[0.14em] text-[#C65D3A] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C65D3A] animate-pulse" />
              Active Dispatch Unit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/analytics">
              <MagneticButton variant="ghost">Telemetry Analytics</MagneticButton>
            </Link>
          </div>
        </header>

        {/* ── Asset Title Banner ── */}
        <div className="pt-12 pb-8 border-b border-[#E8E4DD]">
          <p className="font-editorial-sans text-xs uppercase tracking-[0.2em] text-[#787878] font-medium mb-3">
            Govt. of Rajasthan DTE · MBM University Jodhpur Campus
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <EditorialHeadline level="h1">
              Jodhpur Solar Array Alpha (321 kW)
            </EditorialHeadline>
            <div className="font-editorial-mono text-xs text-[#787878] text-right">
              <div>UID: <strong className="text-[#111213] font-mono">{assetId}</strong></div>
              <div>Commissioned: Oct 2024 · Bi-facial Dual-Axis</div>
            </div>
          </div>
        </div>

        {/* ── Hero Media Schematic ── */}
        <div className="my-10 p-8 sm:p-12 bg-[#FAF9F6] border border-[#E8E4DD] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-lg">
            <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#C65D3A] font-semibold">
              Live Photovoltaic Architecture
            </p>
            <h3 className="font-editorial-serif text-xl sm:text-2xl text-[#111213]">
              840 Bi-Facial Monocrystalline Modules with Intelligent MPPT Tracking
            </h3>
            <p className="text-xs text-[#787878] leading-relaxed">
              Operating at 321 kW peak output across four central high-efficiency inverter cabinets with automated tilt alignment facing Thar desert azimuth.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 border-l border-[#E8E4DD] pl-8">
            <div>
              <span className="text-[10px] uppercase font-editorial-sans tracking-wider text-[#787878]">Instant Yield</span>
              <div className="text-2xl font-editorial-mono text-[#C65D3A] font-medium mt-0.5">321 kW</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-editorial-sans tracking-wider text-[#787878]">Capacity Factor</span>
              <div className="text-2xl font-editorial-mono text-[#006D77] font-medium mt-0.5">80.25%</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-editorial-sans tracking-wider text-[#787878]">String Volt</span>
              <div className="text-2xl font-editorial-mono text-[#111213] font-medium mt-0.5">680 V</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-editorial-sans tracking-wider text-[#787878]">Irradiance</span>
              <div className="text-2xl font-editorial-mono text-[#111213] font-medium mt-0.5">940 W/m²</div>
            </div>
          </div>
        </div>

        {/* ── Asymmetric Layout Grid (65% Main / 35% Sidebar) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
          {/* Main Area (65% - 8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <div className="flex items-end justify-between mb-6 pb-2 border-b border-[#E8E4DD]">
                <h3 className="font-editorial-serif text-xl text-[#111213]">
                  Diurnal Generation Profile (Duck Curve Balancing)
                </h3>
                <span className="font-editorial-mono text-xs text-[#787878]">15m Interval</span>
              </div>
              <EditorialChart height={300} primaryKey="solar" secondaryKey="wind" />
            </div>

            <div>
              <div className="flex items-end justify-between mb-6 pb-2 border-b border-[#E8E4DD]">
                <h3 className="font-editorial-serif text-xl text-[#111213]">
                  Sub-Inverter Telemetry Matrix
                </h3>
                <span className="font-editorial-mono text-xs text-[#787878]">4 Active Strings</span>
              </div>
              <InvisibleTable columns={tableColumns} data={inverterRows} />
            </div>
          </div>

          {/* Sidebar (35% - 4 cols) */}
          <aside className="lg:col-span-4 space-y-8 border-l border-[#E8E4DD] pl-0 lg:pl-8">
            <div>
              <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#787878] mb-3">
                Asset Vitals & Health
              </p>
              <div className="space-y-4 font-editorial-sans text-xs">
                <div className="flex justify-between pb-2 border-b border-[#E8E4DD]">
                  <span className="text-[#787878]">Nominal Plate Capacity:</span>
                  <span className="font-editorial-mono font-medium text-[#111213]">400 kWp</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#E8E4DD]">
                  <span className="text-[#787878]">System Inverter Efficiency:</span>
                  <span className="font-editorial-mono font-medium text-[#006D77]">98.6%</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#E8E4DD]">
                  <span className="text-[#787878]">Grid Export Authorization:</span>
                  <span className="font-editorial-mono font-medium text-[#111213]">Approved (DTE-01)</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#E8E4DD]">
                  <span className="text-[#787878]">Cumulative Avoided CO2e:</span>
                  <span className="font-editorial-mono font-medium text-[#C65D3A]">184.2 Tons</span>
                </div>
              </div>
            </div>

            <div>
              <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#787878] mb-3">
                Microclimate Station
              </p>
              <div className="p-4 bg-[#FAF9F6] border border-[#E8E4DD] space-y-2.5 font-editorial-sans text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#787878]">
                    <Thermometer className="w-3.5 h-3.5 text-[#C65D3A]" /> Ambient Temp:
                  </span>
                  <strong className="font-editorial-mono text-[#111213]">38.4 °C</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#787878]">
                    <Wind className="w-3.5 h-3.5 text-[#006D77]" /> Wind Velocity:
                  </span>
                  <strong className="font-editorial-mono text-[#111213]">4.2 m/s (NW)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#787878]">
                    <Sun className="w-3.5 h-3.5 text-[#C65D3A]" /> GHI Irradiance:
                  </span>
                  <strong className="font-editorial-mono text-[#111213]">942 W/m²</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="font-editorial-sans text-[11px] uppercase tracking-[0.16em] text-[#787878] mb-3">
                VPP Dispatch Directive
              </p>
              <MagneticButton variant="primary" className="w-full">
                Trigger Manual Recalibration
              </MagneticButton>
            </div>
          </aside>
        </div>
      </div>
    </LenisProvider>
  );
}
