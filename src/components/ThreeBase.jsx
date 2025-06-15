import React from 'react';
import { Canvas } from '@react-three/fiber';

export default function ThreeBase() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 5], fov: 60 }}>
        {/* ライト */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {/* ボックス */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>
    </div>
  );
}
