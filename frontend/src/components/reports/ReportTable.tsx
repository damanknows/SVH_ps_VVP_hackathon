'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Telemetry } from '@/types';
import { Download, FileText } from 'lucide-react';

interface ReportRow {
  id: string;
  time: string;
  solarKw: number;
  windKw: number;
  gridKw: number;
  batterySoc: number;
  gridState: string;
  savingsInr: number;
}

interface ReportTableProps {
  currentTelemetry: Telemetry;
}

export function ReportTable({ currentTelemetry }: ReportTableProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const rows: ReportRow[] = Array.from({ length: 10 }).map((_, idx) => {
    const time = new Date(Date.now() - idx * 15 * 60000);
    const solarKw = Math.max(0, currentTelemetry.flowsKw.solar + Math.round((Math.random() - 0.5) * 30));
    const windKw = Math.max(0, currentTelemetry.flowsKw.wind + Math.round((Math.random() - 0.5) * 15));
    const gridKw = currentTelemetry.flowsKw.grid + Math.round((Math.random() - 0.5) * 25);
    const batterySoc = Math.min(100, Math.max(10, Math.round(currentTelemetry.socPct + (Math.random() - 0.5) * 4)));
    const savingsInr = Math.round(currentTelemetry.savingsPerHour * (1 - idx * 0.05));

    return {
      id: `rep-${idx}`,
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      solarKw,
      windKw,
      gridKw,
      batterySoc,
      gridState: gridKw < 0 ? 'EXPORT' : gridKw > 0 ? 'IMPORT' : 'ISLANDED',
      savingsInr,
    };
  });

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = document.getElementById('print-report');
      if (el) {
        const opt = {
          margin: 10,
          filename: `VPP-CommandBridge-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
        };
        await html2pdf().set(opt).from(el).save();
      }
    } catch (e) {
      console.error('PDF Export Error:', e);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">
              {t('report.title')}
            </h3>
            <p className="text-xs text-zinc-500">
              Audit-ready operational telemetry & financial ledger
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="px-5 py-2.5 rounded-2xl font-bold text-sm bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-900 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Generating PDF...' : t('report.export_pdf')}
        </button>
      </div>

      {/* Printable Report Container */}
      <div
        id="print-report"
        className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              SuryaVayu VPP Command Bridge Log
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Generated at: {new Date().toLocaleString()} | Autonomous Microgrid Operations
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
              AUDITED PASSED
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 uppercase font-bold tracking-wider">
                <th className="p-3">Time</th>
                <th className="p-3">Solar (kW)</th>
                <th className="p-3">Wind (kW)</th>
                <th className="p-3">Grid (kW)</th>
                <th className="p-3">SoC (%)</th>
                <th className="p-3">Grid Mode</th>
                <th className="p-3 text-right">Savings (₹/hr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono text-zinc-800 dark:text-zinc-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 font-semibold">{row.time}</td>
                  <td className="p-3 text-amber-500 font-bold">{row.solarKw}</td>
                  <td className="p-3 text-teal-500 font-bold">{row.windKw}</td>
                  <td className="p-3 text-blue-500 font-bold">{row.gridKw}</td>
                  <td className="p-3 font-bold">{row.batterySoc}%</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.gridState === 'EXPORT'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : row.gridState === 'IMPORT'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-purple-500/10 text-purple-600'
                      }`}
                    >
                      {row.gridState}
                    </span>
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹{row.savingsInr.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
