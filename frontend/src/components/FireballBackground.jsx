import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

const FIREBALL_COUNT = 180;

function FireballSwarm() {
  const groupRef = useRef();
  
  // Generate random initial states for the fireballs
  const fireballsData = useMemo(() => {
    const fireballs = [];
    for (let i = 0; i < FIREBALL_COUNT; i++) {
      // Randomize color to be shades of fire (orange, red, yellow)
      const colorMix = Math.random();
      let color;
      if (colorMix > 0.7) {
        color = '#ffb703'; // Yellow/gold
      } else if (colorMix > 0.3) {
        color = '#fb8500'; // Orange
      } else {
        color = '#d00000'; // Deep Red
      }

      fireballs.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 30, // x spread
          (Math.random() - 0.5) * 30, // y spread
          (Math.random() - 0.5) * 15 - 5 // z spread
        ),
        speed: Math.random() * 0.05 + 0.02,
        wobbleSpeed: Math.random() * 2 + 1,
        wobbleSize: Math.random() * 0.05 + 0.01,
        seed: Math.random() * 100,
        color: color,
        scale: Math.random() * 0.2 + 0.05
      });
    }
    return fireballs;
  }, []);

  const fireballRefs = useRef([]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Slow continuous rotation of the entire group
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.2;
    }

    for (let i = 0; i < FIREBALL_COUNT; i++) {
      const fb = fireballRefs.current[i];
      const data = fireballsData[i];
      
      if (!fb) continue;

      // Move upwards
      fb.position.y += data.speed;
      
      // Wobble horizontally to simulate wind/drafts
      fb.position.x += Math.sin(time * data.wobbleSpeed + data.seed) * data.wobbleSize;
      
      // Gentle depth wobble
      fb.position.z += Math.cos(time * data.wobbleSpeed * 0.8 + data.seed) * (data.wobbleSize * 0.5);

      // If fireball goes too high, reset to bottom
      if (fb.position.y > 15) {
        fb.position.y = -15;
        fb.position.x = (Math.random() - 0.5) * 30; // reset horizontal position slightly
      }
    }
  });

  return (
    <group ref={groupRef}>
      {fireballsData.map((data, i) => (
        <Sphere
          key={i}
          ref={(el) => (fireballRefs.current[i] = el)}
          position={[data.position.x, data.position.y, data.position.z]}
          args={[data.scale, 16, 16]}
        >
          <meshBasicMaterial 
            color={data.color} 
            transparent 
            opacity={0.85} 
          />
        </Sphere>
      ))}
    </group>
  );
}

export default function FireballBackground() {
  return (
    <div className="neural-background-container">
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 60 }} 
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        {/* Soft fog to accentuate depth (fade to dark reddish black) */}
        <fog attach="fog" args={['#1a0505', 5, 25]} />
        <FireballSwarm />
      </Canvas>
    </div>
  );
}
