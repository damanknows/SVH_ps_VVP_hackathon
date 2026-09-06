'use client';

import React from 'react';
import { motion } from 'framer-motion';

import { ParticleNetwork } from './ParticleNetwork';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ── n8n-style Workflow Canvas Particle Network (Nodes & Glowing Interconnects) ── */}
      <ParticleNetwork />

      {/* ── Subtle Radial Keynote Grid Overlay ── */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:24px_24px] opacity-80" />

      {/* ── Solar Energy Aurora Mesh (Amber #f5a623) ── */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-radial from-[#f5a623]/15 via-[#f5a623]/5 to-transparent blur-3xl"
      />

      {/* ── Wind Energy Aurora Mesh (Teal #14b8a6) ── */}
      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 60, -40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[30%] -right-[10%] w-[600px] h-[600px] rounded-full bg-radial from-[#14b8a6]/15 via-[#14b8a6]/5 to-transparent blur-3xl"
      />

      {/* ── Grid/Battery Energy Aurora (Blue #3b82f6 & Emerald #22c55e) ── */}
      <motion.div
        animate={{
          x: [0, 50, -40, 0],
          y: [0, -40, 50, 0],
          scale: [0.9, 1.1, 1, 0.9],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-[10%] left-[30%] w-[550px] h-[550px] rounded-full bg-radial from-[#3b82f6]/10 via-[#22c55e]/8 to-transparent blur-3xl"
      />

      {/* ── Floating Energy Particles ── */}
      <div className="absolute inset-0">
        {[
          { top: '15%', left: '20%', delay: 0, color: 'bg-amber-400' },
          { top: '25%', left: '75%', delay: 2, color: 'bg-teal-400' },
          { top: '55%', left: '15%', delay: 4, color: 'bg-emerald-400' },
          { top: '70%', left: '80%', delay: 1, color: 'bg-blue-400' },
          { top: '85%', left: '45%', delay: 3, color: 'bg-amber-300' },
          { top: '40%', left: '50%', delay: 5, color: 'bg-teal-300' },
        ].map((p, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 5 + i * 1.5,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
            style={{ top: p.top, left: p.left }}
            className={`absolute w-2 h-2 rounded-full ${p.color} shadow-lg shadow-current opacity-30 blur-[0.5px]`}
          />
        ))}
      </div>
    </div>
  );
}
