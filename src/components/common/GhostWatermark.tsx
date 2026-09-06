'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface GhostWatermarkProps {
  statText?: string;
  subText?: string;
}

export function GhostWatermark({
  statText = '457 kW',
  subText = '82.4% AUTONOMY',
}: GhostWatermarkProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth buttery spring physics
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 });

  // Subtle 2-4px parallax movement in the OPPOSITE direction of mouse
  const translateX = useTransform(springX, [-1, 1], [4, -4]);
  const translateY = useTransform(springY, [-1, 1], [4, -4]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normalizedX = (e.clientX / innerWidth) * 2 - 1;
      const normalizedY = (e.clientY / innerHeight) * 2 - 1;
      mouseX.set(normalizedX);
      mouseY.set(normalizedY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden z-0">
      <motion.div
        style={{
          x: translateX,
          y: translateY,
        }}
        className="flex flex-col items-center justify-center text-center transform -translate-y-4"
      >
        {/* Massive 15rem Ghost Stat Watermark */}
        <h1
          className="text-[5.5rem] sm:text-[9rem] md:text-[12rem] lg:text-[15rem] font-black tracking-tighter leading-none uppercase font-mono bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-teal-500/10 bg-clip-text text-transparent dark:from-yellow-400/[0.07] dark:via-amber-300/[0.06] dark:to-teal-400/[0.07] opacity-90 drop-shadow-sm filter blur-[0.3px]"
        >
          {statText}
        </h1>

        {/* Secondary Subtitle Watermark */}
        {subText && (
          <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-[0.4em] uppercase text-teal-600/10 dark:text-teal-400/[0.08] -mt-2 sm:-mt-6">
            {subText}
          </span>
        )}
      </motion.div>
    </div>
  );
}
