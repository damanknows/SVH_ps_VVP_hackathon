'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

interface ModelProps {
  socPct?: number;
  activeGenKw?: number;
}

// ── Low-Poly 3D Solar Array & Micro-Turbine Geometry ────────────────────────
function SolarTurbineModel({ socPct = 82.4, activeGenKw = 395 }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const turbineBladesRef = useRef<THREE.Group>(null);

  // Speed scales with generation & SoC
  const rotationSpeed = 0.008 + (activeGenKw / 1000) * 0.015;
  const turbineSpeed = 0.04 + (activeGenKw / 500) * 0.06;

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }
    if (turbineBladesRef.current) {
      turbineBladesRef.current.rotation.z += turbineSpeed;
    }
  });

  const glowIntensity = 0.8 + (socPct / 100) * 1.5;

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* ── Base Pedestal ── */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[1.4, 1.6, 0.15, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── Solar Panel Stand ── */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Solar Panel Face (Angled 28 deg for Rajasthan latitude) ── */}
      <group position={[0, 0.25, 0]} rotation={[0.45, 0, 0]}>
        {/* Panel Frame */}
        <mesh>
          <boxGeometry args={[1.9, 0.06, 1.2]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Solar Silicon Cells (Emissive Dark Blue & Cyan glow) */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.75, 0.02, 1.05]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0ea5e9"
            emissiveIntensity={glowIntensity * 0.6}
            metalness={0.95}
            roughness={0.1}
          />
        </mesh>

        {/* Grid Busbars on Solar Panel */}
        <mesh position={[0, 0.055, 0]}>
          <boxGeometry args={[1.7, 0.005, 0.02]} />
          <meshStandardMaterial color="#f5a623" emissive="#f5a623" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* ── Micro Wind Turbine Mast ── */}
      <group position={[0.7, 0.1, -0.4]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 1.1, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Nacelle */}
        <mesh position={[0, 0.9, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.2, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Rotating Blades (Teal Emissive Glow) */}
        <group ref={turbineBladesRef} position={[0, 0.9, 0.16]}>
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
            <mesh key={i} rotation={[0, 0, angle]} position={[0, 0.25, 0]}>
              <boxGeometry args={[0.05, 0.5, 0.01]} />
              <meshStandardMaterial
                color="#14b8a6"
                emissive="#14b8a6"
                emissiveIntensity={glowIntensity * 0.5}
                roughness={0.2}
              />
            </mesh>
          ))}
          {/* Hub */}
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ThreeDModel({ socPct = 82.4, activeGenKw = 395 }: ModelProps) {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="relative w-full h-[150px] sm:h-[170px] rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg overflow-hidden group">
      {/* Top Header info */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center justify-between right-3 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] font-bold text-zinc-200">
          <Sparkles className="w-3 h-3 text-[#f5a623] animate-pulse" />
          <span>3D Asset Twin</span>
        </div>

        <button
          onClick={() => setEnabled(!enabled)}
          className="pointer-events-auto p-1 rounded-lg bg-black/50 hover:bg-black/70 text-zinc-300 hover:text-white transition border border-white/10 cursor-pointer text-[10px] flex items-center gap-1 px-2"
          title="Toggle 3D visualizer mode for low-power performance"
        >
          {enabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span className="hidden sm:inline">{enabled ? 'Eco' : '3D'}</span>
        </button>
      </div>

      {enabled ? (
        <Canvas
          camera={{ position: [0, 1.2, 3.2], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          className="cursor-grab active:cursor-grabbing"
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#fff" />
          <pointLight position={[-3, 2, -2]} intensity={0.8} color="#f5a623" />
          <pointLight position={[3, 2, 2]} intensity={0.8} color="#14b8a6" />

          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
            <SolarTurbineModel socPct={socPct} activeGenKw={activeGenKw} />
          </Float>

          <ContactShadows position={[0, -0.9, 0]} opacity={0.4} scale={4} blur={2.5} far={4} />
        </Canvas>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-zinc-400 gap-1">
          <Sparkles className="w-5 h-5 text-amber-500/60" />
          <span className="font-semibold text-zinc-300">3D Asset Twin (Eco Mode)</span>
          <span className="text-[10px] text-zinc-500">Rendering suspended for power efficiency</span>
        </div>
      )}

      {/* Bottom live stats overlay */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-zinc-300 pointer-events-none bg-black/40 px-2 py-1 rounded-lg backdrop-blur-xs border border-white/10">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Live Twin Synced
        </span>
        <span className="text-amber-300 font-bold">{activeGenKw} kW Active</span>
      </div>
    </div>
  );
}

export default ThreeDModel;
