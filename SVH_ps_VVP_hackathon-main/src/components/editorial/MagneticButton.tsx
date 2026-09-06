'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'text';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
}

export function MagneticButton({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * 0.15; // strength 0.15
    const deltaY = (e.clientY - centerY) * 0.15;
    x.set(deltaX);
    y.set(deltaY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variantClasses = {
    primary:
      'bg-[#C65D3A] hover:bg-[#b04f2f] text-[#FAF9F6] px-6 py-3 font-editorial-sans text-xs uppercase tracking-[0.14em] font-medium shadow-sm active:scale-95',
    ghost:
      'bg-transparent border border-[#E8E4DD] hover:border-[#C65D3A] text-[#111213] px-6 py-3 font-editorial-sans text-xs uppercase tracking-[0.14em] font-medium active:scale-95',
    text:
      'bg-transparent text-[#111213] hover:text-[#C65D3A] underline underline-offset-4 decoration-[#E8E4DD] hover:decoration-[#C65D3A] px-2 py-1 font-editorial-sans text-xs uppercase tracking-[0.14em] font-medium',
  }[variant];

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none rounded-none ${variantClasses} ${className}`}
    >
      {children}
    </motion.button>
  );
}
