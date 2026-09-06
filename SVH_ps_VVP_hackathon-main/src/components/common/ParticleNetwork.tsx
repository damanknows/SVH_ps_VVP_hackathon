'use client';

import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'solar' | 'wind' | 'load' | 'battery';
  color: string;
  pulsePhase: number;
}

export function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Node count between 55 and 75
    const nodeCount = Math.min(Math.max(Math.floor((width * height) / 22000), 45), 75);
    const nodes: Node[] = [];

    const types: Array<{ type: Node['type']; color: string; ratio: number }> = [
      { type: 'solar', color: '#f5a623', ratio: 0.35 },    // Solar generation (Amber)
      { type: 'wind', color: '#14b8a6', ratio: 0.25 },     // Wind generation (Teal)
      { type: 'battery', color: '#22c55e', ratio: 0.15 },  // BESS storage (Emerald)
      { type: 'load', color: '#38bdf8', ratio: 0.25 },     // Campus load (Cyan/Blue)
    ];

    for (let i = 0; i < nodeCount; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let selected = types[0];
      for (const t of types) {
        cumulative += t.ratio;
        if (rand <= cumulative) {
          selected = t;
          break;
        }
      }

      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: selected.type === 'load' ? 3.5 : selected.type === 'battery' ? 3.2 : 4,
        type: selected.type,
        color: selected.color,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const connectionDistance = 140;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Update positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce gently at screen borders
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }

      // Draw dynamic glowing connecting lines (Workflow Canvas Energy Net)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const proximity = 1 - dist / connectionDistance;
            // Pulsing flow wave
            const pulse = (Math.sin(time * 2 + dist * 0.05) + 1) / 2;
            const alpha = (0.12 + pulse * 0.18) * proximity;

            // Gradient line matching generation/load types
            const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
            grad.addColorStop(0, n1.color);
            grad.addColorStop(1, n2.color);

            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = grad;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1 + proximity * 1.2;
            ctx.stroke();

            // Energy packet dot traveling along the line for active flows
            if (proximity > 0.4 && (i + j) % 3 === 0) {
              const flowProgress = (time * 0.8 + (i * j * 0.1)) % 1;
              const px = n1.x + (n2.x - n1.x) * flowProgress;
              const py = n1.y + (n2.y - n1.y) * flowProgress;

              ctx.beginPath();
              ctx.arc(px, py, 1.8, 0, Math.PI * 2);
              ctx.fillStyle = n1.color;
              ctx.globalAlpha = alpha * 1.8;
              ctx.shadowColor = n1.color;
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // Draw Nodes (Generation & Load nodes with glowing halos)
      for (const node of nodes) {
        const pulse = Math.sin(time * 3 + node.pulsePhase) * 0.3 + 0.7;

        // Outer halo ring for Generation Nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.4 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.globalAlpha = 0.25 * pulse;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Small inner white highlight
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.3, node.y - node.radius * 0.3, node.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70 dark:opacity-85"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
