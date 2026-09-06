'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';

interface EditorialHeadlineProps {
  children: React.ReactNode;
  level?: 'display-xl' | 'h1' | 'h2' | 'h3';
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  splitLines?: boolean;
  className?: string;
}

const lineContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const lineChildVariants: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1], // expo-out
    },
  },
};

export function EditorialHeadline({
  children,
  level = 'h1',
  as = 'h1',
  splitLines = false,
  className = '',
}: EditorialHeadlineProps) {
  const Component = as;

  const sizeClasses = {
    'display-xl': 'text-[clamp(3.5rem,8vw,8.5rem)] leading-[0.92] tracking-[-0.04em]',
    'h1': 'text-[clamp(2.5rem,5vw,5rem)] leading-[0.96] tracking-[-0.03em]',
    'h2': 'text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] tracking-[-0.02em]',
    'h3': 'text-[clamp(1.25rem,2vw,1.85rem)] leading-[1.15] tracking-[-0.01em]',
  }[level];

  if (splitLines && typeof children === 'string') {
    const lines = children.split('\n');
    return (
      <motion.div
        variants={lineContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className={`font-editorial-serif font-normal text-[#111213] ${sizeClasses} ${className}`}
      >
        {lines.map((line, idx) => (
          <div key={idx} className="overflow-hidden">
            <motion.div variants={lineChildVariants}>
              {line}
            </motion.div>
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <Component
      className={`font-editorial-serif font-normal text-[#111213] ${sizeClasses} ${className}`}
    >
      {children}
    </Component>
  );
}
