import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { gsap } from "gsap";

/*───────────────────────────────────────────────────────────
  ShaderMaterial that is INSTANCE‑AWARE (uses instanceMatrix)
───────────────────────────────────────────────────────────*/
function makeInstancePrismMaterial(camera) {
  /**
   * NOTE: instanced meshes expose `attribute mat4 instanceMatrix` automatically.
   * We must multiply it ourselves in the vertex shader so every instance gets
   * its own transform. Built‑in Three.js materials do this for us, but when we
   * roll a custom ShaderMaterial we have to replicate the logic.
   */
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_lightPos: { value: new THREE.Vector3(0, 60, 0) },
      u_cameraPosition: { value: camera.position.clone() },
      u_dispersion: { value: 0.9 },
      u_opacity: { value: 0.18 },
      u_shininess: { value: 90.0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform float u_time;

      void main(){
        // world matrix per‑instance
        mat4 modelInst = modelMatrix * instanceMatrix;

        // world position & normal
        vWorldPos = (modelInst * vec4(position,1.0)).xyz;
        vNormal   = normalize(mat3(modelInst) * normal);

        // --- 波の変位を追加 ---
        float wave = sin(vWorldPos.x * 2.0 + vWorldPos.y * 2.0 + u_time * 2.0) * 1.0;
        vWorldPos += vNormal * wave;

        // model‑view position
        vec4 mvPosition = viewMatrix * vec4(vWorldPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 u_lightPos;
      uniform vec3 u_cameraPosition;
      uniform float u_dispersion, u_opacity, u_shininess;
      varying vec3 vNormal, vWorldPos;

      vec3 hsv2rgb(vec3 c){
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main(){
        vec3 N = normalize(vNormal);
        vec3 V = normalize(u_cameraPosition - vWorldPos);
        vec3 L = normalize(u_lightPos      - vWorldPos);

        float diff = clamp(dot(N, L), 0.0, 1.0);
        float hue  = 0.6 - diff * u_dispersion;
        vec3  base = hsv2rgb(vec3(hue, 1.0, 1.0));

        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
        vec3  R    = reflect(-L, N);
        float spec = pow(max(dot(R, V), 0.0), u_shininess);

        vec3 color = mix(base, vec3(1.0), fres * 0.5) + vec3(spec);
        float alpha = clamp(u_opacity + fres, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
}

/*───────────────────────────────────────────────────────────
  Instanced grid → sphere animation
───────────────────────────────────────────────────────────*/
function AnimatedGridToSphere({ grid, spacing, boxSize, mouse }) {
  const instRef = useRef();
  const { camera, viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  /** Geometry & Material shared by *all* instances */
  const geometry = useMemo(() => new THREE.BoxGeometry(...boxSize), [boxSize]);
  const material = useMemo(() => makeInstancePrismMaterial(camera), [camera]);

  /** Initial & target positions */
  const { startPos, endPos } = useMemo(() => {
    const s = [], e = [];
    const off = (grid - 1) / 2;
    for (let x = 0; x < grid; x++)
      for (let y = 0; y < grid; y++)
        for (let z = 0; z < grid; z++)
          s.push(new THREE.Vector3((x - off) * spacing, (y - off) * spacing, (z - off) * spacing));

    const N = s.length;
    const R = grid * spacing * 0.6;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yVal = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - yVal * yVal));
      const theta = phi * i;
      e.push(new THREE.Vector3(Math.cos(theta) * r * R, yVal * R, Math.sin(theta) * r * R));
    }
    return { startPos: s, endPos: e };
  }, [grid, spacing]);

  const count = startPos.length;
  const parts = useMemo(() => startPos.map(p => ({ cur: p.clone(), tar: p.clone() })), [startPos]);

  /** Timeline: grid ➜ origin ➜ sphere */
  useEffect(() => {
    const tl = gsap.timeline();
    parts.forEach((pt, i) => {
      tl.to(pt.tar, { x: 0, y: 0, z: 0, duration: 1.0, ease: "power2.in" }, 0.3)
        .to(pt.tar, { x: endPos[i].x, y: endPos[i].y, z: endPos[i].z, duration: 1.6, ease: "power3.out" }, "<")
    });
  }, [parts, endPos]);

  /** Frame loop: interpolate + mouse repel */
  useFrame(() => {
    const mouse3D = new THREE.Vector3(
      (mouse.current.x * viewport.width) / 2,
      (mouse.current.y * viewport.height) / 2,
      0
    );

    parts.forEach((pt, i) => {
      const d = pt.cur.distanceTo(mouse3D);
      if (d < spacing * 1.8) {
        pt.cur.add(pt.cur.clone().sub(mouse3D).normalize().multiplyScalar((1 - d / (spacing * 1.8)) * 3));
      }
      pt.cur.lerp(pt.tar, 0.04);
      dummy.position.copy(pt.cur);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    });
    instRef.current.instanceMatrix.needsUpdate = true;

    material.uniforms.u_cameraPosition.value.copy(camera.position);
    material.uniforms.u_time.value += 1 / 60;
  });

  /** One‑time placement */
  useEffect(() => {
    if (!instRef.current) return;
    parts.forEach((pt, i) => {
      dummy.position.copy(pt.cur);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    });
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [parts]);

  return <instancedMesh ref={instRef} args={[geometry, material, count]} />;
}

/*───────────────────────────────────────────────────────────
  Scene wrapper
───────────────────────────────────────────────────────────*/
export default function HarmonyScene() {
  const grid = 50;
  const spacing = 2.4;
  const boxSize = [1, 1, 1];
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <div
      style={{ width: "100%", height: "100vh", background: "#000" }}
      onMouseMove={(e) => {
        mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }}
    >
      <Canvas shadows camera={{ position: [0, grid * spacing * 1.5, grid * spacing * 2.5], fov: 60 }}>
        <color attach="background" args={["#000"]} />
        <OrbitControls />
        <ambientLight intensity={0.45} />
        <spotLight position={[0, 60, 0]} intensity={1.4} angle={0.8} penumbra={0.5} castShadow />
        <EffectComposer>
          <Bloom intensity={0.45} luminanceThreshold={0.25} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
        <AnimatedGridToSphere grid={grid} spacing={spacing} boxSize={boxSize} mouse={mouse} />
      </Canvas>
    </div>
  );
}
