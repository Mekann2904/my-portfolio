import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, useHelper } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

const MODEL_URL = '/model/figure-of-a-dancer-3d-model/scene.gltf';
const PROJECTOR_TEXTURE_URL = 'https://cdn.pixabay.com/photo/2025/05/30/17/15/mountain-9631829_640.jpg';

function ProjectorSpotLight({ textureUrl, params }) {
  const spotRef = useRef();
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  useHelper(spotRef, THREE.SpotLightHelper, 'yellow');

  // SpotLightのmapプロパティをref経由で設定
  useEffect(() => {
    if (spotRef.current && texture) {
      spotRef.current.map = texture;
      spotRef.current.needsUpdate = true;
    }
  }, [texture]);

  return (
    <>
      <spotLight
        ref={spotRef}
        position={params.position}
        angle={params.angle}
        penumbra={params.penumbra}
        intensity={params.intensity}
        distance={params.distance}
        decay={params.decay}
        color={params.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        target-position={params.target}
      />
      {spotRef.current?.target && (
        <primitive object={spotRef.current.target} position={params.target} />
      )}
    </>
  );
}

function Model({ onBounds }) {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      const box = new THREE.Box3().setFromObject(ref.current);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      onBounds && onBounds({ center, size });
    }
  }, [ref, onBounds]);

  return <primitive ref={ref} object={scene} />;
}

export default function ThreeBox4() {
  const [modelInfo, setModelInfo] = useState(null);
  // モデルの中心・サイズからカメラ・ライト初期位置を計算
  const defaultCam = modelInfo
    ? [
        modelInfo.center.x,
        modelInfo.center.y + modelInfo.size.y * 5,
        modelInfo.center.z + modelInfo.size.z * 20
      ]
    : [0, 400, 800];
  const defaultLight = modelInfo
    ? [
        modelInfo.center.x,
        modelInfo.center.y + modelInfo.size.y * 16,
        modelInfo.center.z + modelInfo.size.z * 1.5
      ]
    : [0, 320, 100];
  const defaultTarget = modelInfo
    ? [modelInfo.center.x, modelInfo.center.y, modelInfo.center.z]
    : [0, 0, 0];
  const defaultDistance = modelInfo ? modelInfo.size.y * 2 : 100;

  // LevaでパラメータUI
  const params = useControls({
    intensity: { value: 80000, min: 0, max: 1000000, step: 1 },
    distance: { value: 900, min: 0, max: defaultDistance * 20, step: 1 },
    angle: { value: 0.8, min: 0, max: Math.PI / 2, step: 0.01 },
    penumbra: { value: 0.3, min: 0, max: 1, step: 0.01 },
    decay: { value: 2, min: 1, max: 2, step: 0.01 },
    color: '#ffffff',
    position: { value: defaultLight },
    target: { value: defaultTarget },
  });

  return (
    <div style={{ width: '100vw', height: '100vh', minHeight: 0, margin: 0, padding: 0 }}>
      <Canvas shadows camera={{ position: defaultCam, fov: 50 }}>
        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#bbb" roughness={0.7} />
        </mesh>
        {/* 3Dモデル */}
        <Model onBounds={setModelInfo} />
        {/* プロジェクター風スポットライト */}
        <ProjectorSpotLight textureUrl={PROJECTOR_TEXTURE_URL} params={params} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
