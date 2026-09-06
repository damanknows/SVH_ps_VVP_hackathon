'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { Telemetry } from '@/types';
import { ChartErrorBoundary } from '../common/ChartErrorBoundary';
import {
  Zap,
  Sun,
  Wind,
  ArrowDownRight,
  Building2,
  ArrowUpRight,
  ShieldAlert,
  LayoutGrid,
  Table as TableIcon,
  Play,
  Activity,
} from 'lucide-react';
import { TiltCard } from '@/components/common/TiltCard';

interface SankeyDiagramProps {
  flows: Telemetry['flowsKw'];
}

// Node styling and glowing palettes matching n8n workflow canvas specs
const nodeConfig: Record<
  string,
  {
    color: string;
    glow: string;
    border: string;
    isActiveGenerator?: boolean;
    icon?: string;
  }
> = {
  'Solar': {
    color: '#f5a623',
    glow: 'rgba(245, 166, 35, 0.4)',
    border: 'rgba(245, 166, 35, 0.9)',
    isActiveGenerator: true,
  },
  'Wind': {
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.4)',
    border: 'rgba(20, 184, 166, 0.9)',
    isActiveGenerator: true,
  },
  'Grid Import': {
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.35)',
    border: 'rgba(59, 130, 246, 0.8)',
  },
  'BESS Battery': {
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.35)',
    border: 'rgba(34, 197, 94, 0.8)',
  },
  'Campus Loads': {
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.35)',
    border: 'rgba(139, 92, 246, 0.8)',
  },
  'Export': {
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.35)',
    border: 'rgba(6, 182, 212, 0.8)',
  },
};

const defaultPalette = ['#f5a623', '#14b8a6', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4'];

export function SankeyDiagramContent({ flows }: SankeyDiagramProps) {
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Exact values from prompt / live flows with standard fallbacks
  const solarVal = flows?.solar ?? 321;
  const windVal = flows?.wind ?? 136;
  const gridImportVal = (flows?.grid ?? 0) > 0 ? flows.grid : 0;
  const gridExportVal = (flows?.grid ?? 0) < 0 ? Math.abs(flows.grid) : (flows?.export ?? 45);
  const baseLoadVal = flows?.load ?? 321;
  const criticalLoadVal = flows?.critical_load ?? 124;
  const totalGen = solarVal + windVal; // 321 + 136 = 457 kW

  // Sankey structure: Solar, Wind, Grid Import, BESS Battery, Campus Loads, Export
  const nodes = [
    { name: 'Solar' },        // 0
    { name: 'Wind' },         // 1
    { name: 'Grid Import' },  // 2
    { name: 'BESS Battery' }, // 3
    { name: 'Campus Loads' }, // 4
    { name: 'Export' },       // 5
  ];

  // Flows: Solar (321) -> Load, Wind (136) -> Load, Grid Export (45) -> Export
  const links = [
    { source: 0, target: 4, value: solarVal },
    { source: 1, target: 4, value: windVal },
    ...(gridImportVal > 0 ? [{ source: 2, target: 4, value: gridImportVal }] : []),
    ...(gridExportVal > 0 ? [{ source: 4, target: 5, value: gridExportVal }] : []),
  ];

  // ── Custom n8n Pill-Shaped Node with Neon Glow & Running Status Dot ─────────
  const RenderCustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
    const isRight = x > (containerWidth || 500) / 2;
    const nodeName = payload?.name || '';
    const config = nodeConfig[nodeName] || {
      color: defaultPalette[index % defaultPalette.length],
      glow: 'rgba(255,255,255,0.2)',
      border: 'rgba(255,255,255,0.4)',
    };
    const isHovered = hoveredNode === nodeName;
    const isDimmed = hoveredNode !== null && !isHovered;

    // Minimum visual height for pill node
    const nodeHeight = Math.max(height, 28);
    const nodeWidth = 18;
    const pillRadius = 9;

    return (
      <Layer key={`n8n-node-${index}`}>
        <g
          className="cursor-pointer transition-all duration-300"
          style={{ opacity: isDimmed ? 0.35 : 1 }}
          onMouseEnter={() => setHoveredNode(nodeName)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Subtle Outer Neon Glow for Active Nodes */}
          <rect
            x={x - 2}
            y={y - 2}
            width={nodeWidth + 4}
            height={nodeHeight + 4}
            rx={pillRadius + 2}
            fill="none"
            stroke={config.border}
            strokeWidth={isHovered ? 2.5 : 1.2}
            style={{
              filter: `drop-shadow(0 0 10px ${config.glow})`,
            }}
            className="animate-pulse"
          />

          {/* Pill Node Main Body */}
          <Rectangle
            x={x}
            y={y}
            width={nodeWidth}
            height={nodeHeight}
            fill={config.color}
            fillOpacity={0.95}
            rx={pillRadius}
          />

          {/* n8n Node Port Indicator Dot */}
          <circle
            cx={isRight ? x : x + nodeWidth}
            cy={y + nodeHeight / 2}
            r={3}
            fill="#ffffff"
            stroke={config.color}
            strokeWidth={1.5}
          />

          {/* Active Generator Running Status Badge (Solar & Wind) */}
          {config.isActiveGenerator && (
            <g transform={`translate(${isRight ? x - 26 : x + nodeWidth + 8}, ${y + nodeHeight / 2 - 7})`}>
              <circle cx="6" cy="7" r="3.5" fill="#22c55e" className="animate-ping opacity-75" />
              <circle cx="6" cy="7" r="3" fill="#22c55e" />
            </g>
          )}

          {/* Node Label Text */}
          <text
            x={isRight ? x - (config.isActiveGenerator ? 32 : 12) : x + nodeWidth + (config.isActiveGenerator ? 22 : 12)}
            y={y + nodeHeight / 2}
            textAnchor={isRight ? 'end' : 'start'}
            fontSize="12"
            fontWeight={isHovered ? '800' : '700'}
            fill="currentColor"
            alignmentBaseline="middle"
            className="fill-zinc-800 dark:fill-zinc-100 font-sans tracking-tight"
          >
            {nodeName} <tspan className="font-mono text-zinc-500 dark:text-zinc-400 font-normal">({payload?.value ?? 0} kW)</tspan>
          </text>
        </g>
      </Layer>
    );
  };

  // ── Custom n8n Flow Link with Animated Flowing Particles & Focus Mode ────────
  const RenderCustomLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
    const sourceName = payload?.source?.name || '';
    const targetName = payload?.target?.name || '';
    const config = nodeConfig[sourceName] || { color: defaultPalette[0], glow: 'rgba(245, 166, 35, 0.4)' };

    const isDirectlyConnected = hoveredNode === sourceName || hoveredNode === targetName;
    const isDimmed = hoveredNode !== null && !isDirectlyConnected;

    const pathData = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
    const strokeW = Math.max(4, linkWidth);

    return (
      <g
        className="transition-all duration-300 cursor-pointer"
        style={{ opacity: isDimmed ? 0.08 : 1 }}
        onMouseEnter={() => setHoveredNode(sourceName)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {/* Base Flow Path */}
        <path
          d={pathData}
          fill="none"
          stroke={config.color}
          strokeWidth={isDirectlyConnected ? strokeW + 2 : strokeW}
          strokeOpacity={isDirectlyConnected ? 0.85 : 0.35}
          style={{
            filter: isDirectlyConnected ? `drop-shadow(0 0 8px ${config.color})` : undefined,
          }}
        />

        {/* Animated Flowing Particles (Energy stream dots along path) */}
        <path
          d={pathData}
          fill="none"
          stroke="#ffffff"
          strokeWidth={Math.min(strokeW * 0.45, 3.5)}
          strokeDasharray="6 18"
          strokeOpacity={0.9}
          className="n8n-flow-stream"
        />

        {/* Glow Track Line */}
        <path
          d={pathData}
          fill="none"
          stroke={config.color}
          strokeWidth={Math.min(strokeW * 0.7, 5)}
          strokeDasharray="4 24"
          strokeOpacity={0.8}
          className="n8n-flow-stream-glow"
        />
      </g>
    );
  };

  return (
    <div className="w-full flex flex-col justify-between space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/20 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
            </span>
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
              LIVE POWER FLOW DISTRIBUTION (KW)
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              n8n Workflow Graph
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ml-9">
            Real-time multi-source generation & campus load balancing
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Total Gen Highlight Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-emerald-500/15 border border-amber-500/25 shadow-xs">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Gen:
            </span>
            <span className="text-sm font-extrabold text-[#f5a623] font-mono">
              {totalGen} kW
            </span>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-white/40 dark:bg-white/5 p-1 rounded-xl border border-white/20 dark:border-white/10">
            <button
              onClick={() => setViewMode('diagram')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'diagram'
                  ? 'bg-white/80 dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Diagram View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white/80 dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Flow Legend with Active Indicator Markers ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 px-1">
        <span
          onMouseEnter={() => setHoveredNode('Solar')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'Solar' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#f5a623] inline-block shadow-xs shadow-amber-500/50" />
          Solar ({solarVal} kW)
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active Generator" />
        </span>
        <span
          onMouseEnter={() => setHoveredNode('Wind')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'Wind' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#14b8a6] inline-block shadow-xs shadow-teal-500/50" />
          Wind ({windVal} kW)
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active Generator" />
        </span>
        <span
          onMouseEnter={() => setHoveredNode('Grid Import')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'Grid Import' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block shadow-xs shadow-blue-500/50" />
          Grid Import ({gridImportVal} kW)
        </span>
        <span
          onMouseEnter={() => setHoveredNode('BESS Battery')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'BESS Battery' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block shadow-xs shadow-emerald-500/50" />
          BESS Battery (0 kW)
        </span>
        <span
          onMouseEnter={() => setHoveredNode('Campus Loads')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'Campus Loads' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block shadow-xs shadow-purple-500/50" />
          Campus Loads
        </span>
        <span
          onMouseEnter={() => setHoveredNode('Export')}
          onMouseLeave={() => setHoveredNode(null)}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
            hoveredNode && hoveredNode !== 'Export' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#06b6d4] inline-block shadow-xs shadow-cyan-500/50" />
          Export ({gridExportVal} kW)
        </span>
      </div>

      {/* ── Sankey Visualization ── */}
      {viewMode === 'diagram' ? (
        <div className="w-full h-[270px] sm:h-[300px] my-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes, links }}
              nodePadding={28}
              nodeWidth={18}
              node={RenderCustomNode}
              link={RenderCustomLink}
              margin={{ top: 15, right: 140, bottom: 15, left: 140 }}
            >
              <Tooltip
                formatter={(value: any, name: any, item: any) => {
                  const src = item?.payload?.source?.name || 'Source';
                  const tgt = item?.payload?.target?.name || 'Target';
                  return [`${value} kW`, `${src} ➔ ${tgt}`];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(10, 15, 30, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      ) : (
        <TableFallback
          solar={solarVal}
          wind={windVal}
          gridImport={gridImportVal}
          gridExport={gridExportVal}
          baseLoad={baseLoadVal}
          criticalLoad={criticalLoadVal}
        />
      )}

      {/* ── Breakdown Boxes Below Diagram ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {/* 1. Grid Import (0 kW) */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Grid Import
            </span>
            <p className="text-lg font-light text-blue-950 dark:text-blue-100 font-mono mt-0.5">
              {gridImportVal} kW
            </p>
          </div>
          <div className="p-2 bg-blue-500/15 text-[#3b82f6] rounded-xl">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Base Load (321 kW) */}
        <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Base Load
            </span>
            <p className="text-lg font-light text-purple-950 dark:text-purple-100 font-mono mt-0.5">
              {baseLoadVal} kW
            </p>
          </div>
          <div className="p-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-xl">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Grid Export (45 kW) */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Grid Export
            </span>
            <p className="text-lg font-light text-emerald-950 dark:text-emerald-100 font-mono mt-0.5">
              {gridExportVal} kW
            </p>
          </div>
          <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Critical Load (124 kW) */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-800/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Critical Load
            </span>
            <p className="text-lg font-light text-rose-950 dark:text-rose-100 font-mono mt-0.5">
              {criticalLoadVal} kW
            </p>
          </div>
          <div className="p-2 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableFallback({ solar, wind, gridImport, gridExport, baseLoad, criticalLoad }: any) {
  return (
    <div className="p-4 border border-white/20 dark:border-white/10 rounded-2xl bg-white/40 dark:bg-white/5 text-xs space-y-3">
      <h4 className="font-bold text-zinc-700 dark:text-zinc-300">Live Power Flow Matrix</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <span className="text-[10px] uppercase font-bold text-[#f5a623] block">Solar Yield</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{solar} kW</strong>
        </div>
        <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/20">
          <span className="text-[10px] uppercase font-bold text-[#14b8a6] block">Wind Power</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{wind} kW</strong>
        </div>
        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <span className="text-[10px] uppercase font-bold text-[#3b82f6] block">Grid Import</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{gridImport} kW</strong>
        </div>
        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <span className="text-[10px] uppercase font-bold text-purple-500 block">Base Load</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{baseLoad} kW</strong>
        </div>
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold text-[#22c55e] block">Grid Export</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{gridExport} kW</strong>
        </div>
        <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
          <span className="text-[10px] uppercase font-bold text-rose-500 block">Critical Load</span>
          <strong className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{criticalLoad} kW</strong>
        </div>
      </div>
    </div>
  );
}

export function SankeyDiagram(props: SankeyDiagramProps) {
  return (
    <TiltCard maxTilt={3} scale={1.01}>
      <div className="p-5 sm:p-6 rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] w-full">
        <ChartErrorBoundary fallback={<TableFallback {...props.flows} />}>
          <SankeyDiagramContent {...props} />
        </ChartErrorBoundary>
      </div>
    </TiltCard>
  );
}
