'use client';

import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { Telemetry } from '@/types';
import { ChartErrorBoundary } from '../common/ChartErrorBoundary';

interface SankeyDiagramProps {
  flows: Telemetry['flowsKw'];
}

export function SankeyDiagramContent({ flows }: SankeyDiagramProps) {
  const nodes = [
    { name: 'Solar' },
    { name: 'Wind' },
    { name: 'Grid Import' },
    { name: 'Battery (BESS)' },
    { name: 'Base Load' },
    { name: 'Critical Load' },
    { name: 'Grid Export' },
  ];

  const solarVal = Math.max(0, flows.solar || 0);
  const windVal = Math.max(0, flows.wind || 0);
  const gridImportVal = flows.grid > 0 ? flows.grid : 0;
  const gridExportVal = flows.grid < 0 ? Math.abs(flows.grid) : flows.export || 0;

  const totalGen = solarVal + windVal + gridImportVal;

  const links = [
    { source: 0, target: 4, value: Math.round(solarVal * 0.6) },
    { source: 0, target: 5, value: Math.round(solarVal * 0.2) },
    { source: 0, target: 3, value: Math.round(solarVal * 0.2) },

    { source: 1, target: 4, value: Math.round(windVal * 0.7) },
    { source: 1, target: 5, value: Math.round(windVal * 0.3) },

    { source: 2, target: 4, value: Math.round(gridImportVal) },

    { source: 3, target: 6, value: Math.round(gridExportVal) },
  ].filter((l) => l.value > 0);

  const activeLinks =
    links.length > 0
      ? links
      : [
          { source: 0, target: 4, value: 200 },
          { source: 1, target: 4, value: 80 },
          { source: 2, target: 5, value: 50 },
        ];

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col justify-between">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Power Flow Distribution (kW)
        </h3>
        <span className="text-xs text-zinc-500 font-mono">
          Total Generation: {totalGen} kW
        </span>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links: activeLinks }}
            nodePadding={28}
            nodeWidth={12}
            link={{ stroke: 'var(--color-grid)', strokeOpacity: 0.35 }}
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          >
            <Tooltip
              formatter={(value: any) => [`${value} kW`, 'Power Flow']}
              contentStyle={{
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                borderColor: '#3f3f46',
                borderRadius: '8px',
                color: '#f4f4f5',
                fontSize: '12px',
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableFallback({ flows }: SankeyDiagramProps) {
  return (
    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 text-xs">
      <h4 className="font-bold text-zinc-700 dark:text-zinc-300 mb-2">Power Flow Breakdown</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 bg-amber-500/10 rounded">Solar: <strong>{flows.solar} kW</strong></div>
        <div className="p-2 bg-teal-500/10 rounded">Wind: <strong>{flows.wind} kW</strong></div>
        <div className="p-2 bg-blue-500/10 rounded">Grid: <strong>{flows.grid} kW</strong></div>
        <div className="p-2 bg-emerald-500/10 rounded">Battery: <strong>{flows.battery} kW</strong></div>
      </div>
    </div>
  );
}

export function SankeyDiagram(props: SankeyDiagramProps) {
  return (
    <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm h-full">
      <ChartErrorBoundary fallback={<TableFallback {...props} />}>
        <SankeyDiagramContent {...props} />
      </ChartErrorBoundary>
    </div>
  );
}
