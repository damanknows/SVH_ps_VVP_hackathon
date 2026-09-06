'use client';

import React, { useEffect, useState } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 60, damping: 15, restDelta: 0.001 });
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return current.toFixed(decimals);
    }
    return Math.round(current).toLocaleString('en-IN');
  });

  const [formatted, setFormatted] = useState(
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN')
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setFormatted(latest);
    });
  }, [display]);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
