import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Tween, Easing, update as tweenUpdate } from "@tweenjs/tween.js";

// 霧のシェーダー定義 (変更なし)
const fogVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fogFragmentShader = `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;

    // パーリンノイズ関数
    vec4 permute(vec4 x) {
        return mod(((x*34.0)+1.0)*x, 289.0);
    }

    vec2 fade(vec2 t) {
        return t*t*t*(t*(t*6.0-15.0)+10.0);
    }

    float cnoise(vec2 P) {
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod(Pi, 289.0);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x,gy.x);
        vec2 g10 = vec2(gx.y,gy.y);
        vec2 g01 = vec2(gx.z,gy.z);
        vec2 g11 = vec2(gx.w,gy.w);
        vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00,g00), dot(g10,g10), dot(g01,g01), dot(g11,g11));
        g00 *= norm.x;
        g10 *= norm.y;
        g01 *= norm.z;
        g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
    }

    void main() {
        vec2 uv = vUv;
        
        float noise1 = cnoise(uv * 3.0 + vec2(uTime * 0.05, uTime * 0.03));
        float noise2 = cnoise(uv * 2.0 + vec2(-uTime * 0.04, uTime * 0.02));
        float noise3 = cnoise(uv * 1.5 + vec2(uTime * 0.03, -uTime * 0.04));
        
        float finalNoise = (noise1 + noise2 + noise3) / 3.0;
        finalNoise = smoothstep(0.2, 0.8, finalNoise);
        
        float edge = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
        finalNoise *= edge;
        
        vec3 finalColor = mix(uColor * 0.5, uColor, finalNoise);
        float alpha = finalNoise * 0.15;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// アニメーションの定数 (変更なし)
const FINALE_START_Z = -2000;
const FINALE_OBJECT_Z = -2500;
const MAX_DYNAMIC_LIGHTS = 50;
const LIGHT_SPAWN_INTERVAL = 100;
const CAMERA_ORBIT_RADIUS = 600;
const FINALE_TRANSITION_DURATION = 4000;

// シェーダー定義 (変更なし)
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPulse;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  // 改良された波動関数
  float waveEffect(vec3 pos, float time) {
    float dist = length(pos.xy);
    float wave = sin(dist * 3.0 - time * 1.5) * 0.5 + 0.5;
    wave *= smoothstep(2.0, 0.0, dist);
    return wave;
  }

  // ブラックホール効果
  vec2 blackHoleDistortion(vec2 uv, float time) {
    vec2 center = vec2(0.5);
    vec2 delta = uv - center;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);
    
    float distortion = 0.2 / (dist + 0.1);
    float rotation = time * 0.2;
    
    float newDist = dist + distortion * 0.1;
    float newAngle = angle + rotation * (1.0 - dist);
    
    return center + vec2(
      newDist * cos(newAngle),
      newDist * sin(newAngle)
    );
  }

  // 知識ネットワークパターン
  float networkPattern(vec3 pos, float time) {
    float pattern = 0.0;
    for(int i = 0; i < 3; i++) {
      float scale = 1.0 + float(i) * 2.0;
      vec3 p = pos * scale + time * 0.1;
      pattern += sin(p.x) * sin(p.y) * sin(p.z) * 0.5;
    }
    return pattern * 0.5 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec2 distortedUv = blackHoleDistortion(vUv, uTime);
    float distortionIntensity = length(distortedUv - vUv);

    float wave = waveEffect(vPosition, uTime);
    
    float network = networkPattern(vPosition, uTime);

    float pulse = sin(uTime * 0.5) * 0.15 + 0.85;
    
    vec3 baseColor = mix(
      vec3(0.2, 0.0, 0.4),
      vec3(0.6, 0.2, 0.8),
      fresnel
    );
    
    vec3 energyColor = vec3(0.8, 0.4, 1.0);
    float energyIntensity = wave * network * pulse;
    
    vec3 finalColor = mix(baseColor, energyColor, energyIntensity);
    finalColor += vec3(0.6, 0.3, 0.9) * distortionIntensity;
    
    finalColor *= 1.5;
    
    float alpha = uOpacity * (0.7 + 0.3 * (fresnel + energyIntensity));
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// (generateOptimizedNetwork 関数は変更なし)
function generateOptimizedNetwork(nodeCount, linkCount, radius) {
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = radius * (0.8 + 0.4 * Math.random());
        nodes.push({
            position: new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            ),
            color: new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 0.9, 0.7)
        });
    }
    
    const linkPoints = [];
    for (let i = 0; i < linkCount; i++) {
        const a = Math.floor(Math.random() * nodeCount);
        let b = Math.floor(Math.random() * nodeCount);
        if (a === b) b = (b + 1) % nodeCount;
        linkPoints.push(nodes[a].position, nodes[b].position);
    }
    
    return { nodes, linkPoints };
}


export default function ThreeBox() {
    const mountRef = useRef(null);
    const state = useRef({
        phase: 'NAVIGATING',
        // 【変更】自動進行用の速度変数を削除し、スクロール用の速度変数を追加
        scrollVelocity: 0,
        finaleOpacity: 0,
        finaleStartTime: 0,
        dynamicLights: [],
        nextLightSpawnZ: 0,
        cameraOrbit: { theta: 0, phi: Math.PI / 4, radius: CAMERA_ORBIT_RADIUS },
        networkRotation: { x: 0, y: 0, z: 0 },
        finaleTriggered: false
    }).current;

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        // 【追加】スクロールイベントを処理する関数
        const onWheel = (event) => {
            // スクロール量に応じて速度を変化させる
            // event.deltaY の値は環境によるが、通常は上下スクロールで100程度の値が入る
            // 速度の係数（ここでは0.5）を調整することで、スクロールの感度を変更できる
            state.scrollVelocity -= event.deltaY * 0.1;
        };
        // 【追加】イベントリスナーを登録
        currentMount.addEventListener("wheel", onWheel, { passive: true });


        // シーンのセットアップ (変更なし)
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a1020, 0.001);
        
        const camera = new THREE.PerspectiveCamera(90, currentMount.clientWidth / currentMount.clientHeight, 0.1, 12000);
        camera.position.set(0, 0, 800);

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            stencil: false
        });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 2.0;
        currentMount.appendChild(renderer.domElement);
        
        // ポストプロセス設定 (変更なし)
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight),
            3.0,
            0.2,
            0.5
        );
        composer.addPass(bloomPass);
        
        // --- ここから先のオブジェクト生成ロジックは変更ありません ---

        // ネットワーククラスターの生成
        const CLUSTER_COUNT = 512; 
        const clusterGroups = [];
        const nodeGeom = new THREE.SphereGeometry(1.0, 32, 32);
        const nodeMat = new THREE.MeshStandardMaterial({ 
            transparent: true,
            opacity: 0.8,
            emissive: 0x666666,
            roughness: 0.1,
            metalness: 0.9
        });
        const linkMat = new THREE.LineBasicMaterial({ 
            color: 0x66ddff,
            transparent: true,
            opacity: 0.25
        });

        const createClusterPosition = (index) => {
            const finaleCenter = new THREE.Vector3(0, 0, FINALE_OBJECT_Z);
            const distributionType = Math.random();
            let clusterPosition = { x: 0, y: 0, z: 0 };

            if (distributionType < 0.4) {
                clusterPosition.z = 100 + Math.random() * 1500;
                const nearPathDeviation = 500 + Math.random() * 1000;
                const nearPathAngle = Math.random() * Math.PI * 2;
                clusterPosition.x = Math.cos(nearPathAngle) * nearPathDeviation;
                clusterPosition.y = Math.sin(nearPathAngle) * nearPathDeviation;
            }
            else if (distributionType < 0.7) {
                clusterPosition.z = -200 - Math.random() * 5000;
                const midPathDeviation = 800 + Math.random() * 1200;
                const midPathAngle = Math.random() * Math.PI * 2;
                clusterPosition.x = Math.cos(midPathAngle) * midPathDeviation;
                clusterPosition.y = Math.sin(midPathAngle) * midPathDeviation;
            }
            else if (distributionType < 0.8) {
                const phi = Math.acos(2 * Math.random() - 1);
                const theta = Math.random() * Math.PI * 2;
                const radius = 400 + Math.random() * 600;
                
                clusterPosition.x = Math.sin(phi) * Math.cos(theta) * radius;
                clusterPosition.y = Math.sin(phi) * Math.sin(theta) * radius;
                clusterPosition.z = FINALE_OBJECT_Z + Math.cos(phi) * radius;
            }
            else {
                clusterPosition.x = (Math.random() - 0.5) * 1000;
                clusterPosition.y = (Math.random() - 0.5) * 1000;
                clusterPosition.z = Math.random() * FINALE_OBJECT_Z;
            }

            const distanceFromFinale = Math.sqrt(
                Math.pow(clusterPosition.x, 2) + 
                Math.pow(clusterPosition.y, 2) + 
                Math.pow(clusterPosition.z - FINALE_OBJECT_Z, 2)
            );
            const maxDistance = Math.abs(FINALE_OBJECT_Z);
            const radiusScale = 0.3 + (1 - distanceFromFinale / maxDistance) * 0.7;
            const baseRadius = (200 + Math.random() * 150) * radiusScale;

            const finalPosition = new THREE.Vector3(
                clusterPosition.x,
                clusterPosition.y,
                clusterPosition.z
            );
            
            const position = finalPosition.clone().add(finaleCenter);
            
            const distanceFromAxis = Math.sqrt(
                clusterPosition.x * clusterPosition.x + 
                clusterPosition.y * clusterPosition.y
            );
            if (distanceFromAxis > 350) {
                const pullToward = 0.85 + Math.random() * 0.1;
                clusterPosition.x *= pullToward;
                clusterPosition.y *= pullToward;
                position.set(
                    clusterPosition.x,
                    clusterPosition.y,
                    clusterPosition.z
                ).add(finaleCenter);
            }
            
            return position;
        };

        for (let i = 0; i < CLUSTER_COUNT; i++) {
            const { nodes, linkPoints } = generateOptimizedNetwork(
                20 + Math.floor(Math.random() * 8),
                28 + Math.floor(Math.random() * 12),
                12 + Math.random() * 4
            );
            
            const inst = new THREE.InstancedMesh(nodeGeom, nodeMat.clone(), nodes.length);
            const dummy = new THREE.Object3D();
            
            nodes.forEach((n, j) => {
                dummy.position.copy(n.position);
                dummy.updateMatrix();
                inst.setMatrixAt(j, dummy.matrix);
                inst.setColorAt(j, n.color);
            });

            const lines = new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints(linkPoints),
                linkMat.clone()
            );

            const group = new THREE.Group();
            group.add(inst, lines);
            
            const position = createClusterPosition(i);
            group.position.copy(position);
            
            group.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            const distanceFromFinale = position.distanceTo(new THREE.Vector3(0, 0, FINALE_OBJECT_Z));
            const speedFactor = Math.min(1, distanceFromFinale / 800);

            group.userData.movement = {
                orbitRadius: distanceFromFinale,
                orbitSpeed: 0.005 + Math.random() * 0.005 * speedFactor,
                orbitPhase: Math.random() * Math.PI * 2,
                verticalSpeed: 0.002 + Math.random() * 0.003 * speedFactor,
                verticalPhase: Math.random() * Math.PI * 2,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.0001 * speedFactor,
                    (Math.random() - 0.5) * 0.0001 * speedFactor,
                    (Math.random() - 0.5) * 0.0001 * speedFactor
                )
            };
            
            clusterGroups.push(group);
            scene.add(group);
        }

        // フィナーレオブジェクトの設定
        const finaleMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0.8 },
                uPulse: { value: 0.5 },
                uColor1: { value: new THREE.Color(0.2, 0.0, 0.4) },
                uColor2: { value: new THREE.Color(0.4, 0.1, 0.6) },
                uColor3: { value: new THREE.Color(0.6, 0.3, 0.8) }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const finaleObj = new THREE.Mesh(
            new THREE.IcosahedronGeometry(150, 64),
            finaleMat
        );
        finaleObj.position.set(0, 0, FINALE_OBJECT_Z);
        scene.add(finaleObj);

        // 光源の配置
        const createArtisticLight = (color, intensity, distance) => {
            const light = new THREE.PointLight(color, intensity, distance);
            light.userData.orbitParams = {
                phase: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.2,
                radius: 100 + Math.random() * 200,
                verticalOffset: Math.random() * Math.PI,
                inclination: Math.random() * Math.PI / 3
            };
            return light;
        };

        const lightColors = [
            new THREE.Color(0.4, 0.2, 0.8),
            new THREE.Color(0.3, 0.1, 0.6),
            new THREE.Color(0.5, 0.3, 0.9),
            new THREE.Color(0.2, 0.0, 0.4)
        ];

        const lights = lightColors.map(color => 
            createArtisticLight(color, 8, 600)
        );
        lights.forEach(light => scene.add(light));

        scene.add(new THREE.AmbientLight(0x1a0033, 0.3));

        // 光の粒子システム
        const PARTICLE_COUNT = 20000;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
        const particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const distributionType = Math.random();
            let position = { x: 0, y: 0, z: 0 };

            if (distributionType < 0.4) {
                position.z = 100 + Math.random() * 1500;
                const deviation = 500 + Math.random() * 1000;
                const angle = Math.random() * Math.PI * 2;
                position.x = Math.cos(angle) * deviation;
                position.y = Math.sin(angle) * deviation;
            }
            else if (distributionType < 0.7) {
                position.z = -200 - Math.random() * 5000;
                const deviation = 800 + Math.random() * 1200;
                const angle = Math.random() * Math.PI * 2;
                position.x = Math.cos(angle) * deviation;
                position.y = Math.sin(angle) * deviation;
            }
            else if (distributionType < 0.8) {
                const phi = Math.acos(2 * Math.random() - 1);
                const theta = Math.random() * Math.PI * 2;
                const radius = 600 + Math.random() * 800;
                position.x = Math.sin(phi) * Math.cos(theta) * radius;
                position.y = Math.sin(phi) * Math.sin(theta) * radius;
                position.z = FINALE_OBJECT_Z + Math.cos(phi) * radius;
            }
            else {
                position.x = (Math.random() - 0.5) * 2000;
                position.y = (Math.random() - 0.5) * 2000;
                position.z = Math.random() * FINALE_OBJECT_Z;
            }
            
            particlePositions[i * 3] = position.x;
            particlePositions[i * 3 + 1] = position.y;
            particlePositions[i * 3 + 2] = position.z;
            
            particleVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
            particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: true,
            color: 0x6633ff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        // 霧エフェクト
        const fogLayers = [];
        const createFogLayer = (y, scale) => {
            const geometry = new THREE.PlaneGeometry(2000, 2000);
            const material = new THREE.ShaderMaterial({
                vertexShader: fogVertexShader,
                fragmentShader: fogFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(0.4, 0.2, 0.6) }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = y;
            mesh.rotation.x = Math.PI / 2;
            mesh.scale.set(scale, scale, 1);
            return mesh;
        };

        for (let i = 0; i < 8; i++) {
            const y = -200 + i * 50;
            const scale = 0.8 + Math.random() * 0.4;
            const layer = createFogLayer(y, scale);
            fogLayers.push(layer);
            scene.add(layer);
        }

        // 重力場
        const GRAVITY_POINTS = 0;
        const gravityPoints = [];
        
        for (let i = 0; i < GRAVITY_POINTS; i++) {
            gravityPoints.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * 1500,
                    (Math.random() - 0.5) * 1500,
                    -300 - Math.random() * 1200
                ),
                mass: 2000 + Math.random() * 3000,
                visualMesh: null
            });
        }

        const gravitySourceGeometry = new THREE.SphereGeometry(20, 32, 32);
        const gravitySourceMaterial = new THREE.MeshPhongMaterial({
            color: 0x9933ff,
            emissive: 0x330066,
            transparent: true,
            opacity: 0.7
        });

        const GRAVITY_FIELD_LINES = 200;
        const gravityFieldGeometry = new THREE.BufferGeometry();
        const gravityFieldPositions = new Float32Array(GRAVITY_FIELD_LINES * 6);
        const gravityFieldMaterial = new THREE.LineBasicMaterial({
            color: 0x6600cc,
            transparent: true,
            opacity: 0.3
        });

        for (let i = 0; i < GRAVITY_FIELD_LINES; i++) {
            const startPoint = new THREE.Vector3(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
            gravityFieldPositions[i * 6] = startPoint.x;
            gravityFieldPositions[i * 6 + 1] = startPoint.y;
            gravityFieldPositions[i * 6 + 2] = startPoint.z;
            gravityFieldPositions[i * 6 + 3] = startPoint.x;
            gravityFieldPositions[i * 6 + 4] = startPoint.y;
            gravityFieldPositions[i * 6 + 5] = startPoint.z;
        }

        gravityFieldGeometry.setAttribute('position', new THREE.BufferAttribute(gravityFieldPositions, 3));
        const gravityFieldLines = new THREE.LineSegments(gravityFieldGeometry, gravityFieldMaterial);
        scene.add(gravityFieldLines);

        gravityPoints.forEach(point => {
            const mesh = new THREE.Mesh(gravitySourceGeometry, gravitySourceMaterial.clone());
            mesh.position.copy(point.position);
            mesh.scale.setScalar(Math.pow(point.mass / 1000, 1/3));
            point.visualMesh = mesh;
            scene.add(mesh);
        });

        const calculateGravity = (position) => {
            const acceleration = new THREE.Vector3(0, 0, 0);
            gravityPoints.forEach(point => {
                const direction = new THREE.Vector3().subVectors(point.position, position);
                const distance = direction.length();
                if (distance > 50) {
                    const forceMagnitude = point.mass / (distance * distance);
                    acceleration.add(direction.normalize().multiplyScalar(forceMagnitude * 0.00005));
                }
            });
            return acceleration;
        };

        const updateGravityField = () => {
            const positions = gravityFieldGeometry.attributes.position.array;
            
            for (let i = 0; i < GRAVITY_FIELD_LINES; i++) {
                const startPoint = new THREE.Vector3(positions[i * 6], positions[i * 6 + 1], positions[i * 6 + 2]);
                const acceleration = calculateGravity(startPoint);
                const endPoint = startPoint.clone().add(acceleration.multiplyScalar(100000));
                positions[i * 6 + 3] = endPoint.x;
                positions[i * 6 + 4] = endPoint.y;
                positions[i * 6 + 5] = endPoint.z;
            }
            
            gravityFieldGeometry.attributes.position.needsUpdate = true;
        };

        const updateParticles = () => {
            const positions = particleGeometry.attributes.position.array;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                let x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
                
                const currentPos = new THREE.Vector3(x, y, z);
                const acceleration = calculateGravity(currentPos);
                
                particleVelocities[i * 3] += acceleration.x;
                particleVelocities[i * 3 + 1] += acceleration.y;
                particleVelocities[i * 3 + 2] += acceleration.z;
                
                particleVelocities[i * 3] *= 0.99;
                particleVelocities[i * 3 + 1] *= 0.99;
                particleVelocities[i * 3 + 2] *= 0.99;
                
                x += particleVelocities[i * 3] * 0.5;
                y += particleVelocities[i * 3 + 1] * 0.5;
                z += particleVelocities[i * 3 + 2] * 0.5;
                
                const bound = 2000;
                if (Math.abs(x) > bound) { x *= -0.8; particleVelocities[i * 3] *= -0.8; }
                if (Math.abs(y) > bound) { y *= -0.8; particleVelocities[i * 3 + 1] *= -0.8; }
                if (Math.abs(z) > bound) { z *= -0.8; particleVelocities[i * 3 + 2] *= -0.8; }
                
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;
            }
            particleGeometry.attributes.position.needsUpdate = true;
        };
        
        // --- ここまでのオブジェクト生成ロジックは変更ありません ---


        // アニメーションループ
        const clock = new THREE.Clock();
        let frameId;

        const checkAndTriggerFinale = (currentZ) => {
            if (!state.finaleTriggered && currentZ <= FINALE_START_Z) {
                state.finaleTriggered = true;
                state.phase = 'FINALE';
                state.finaleStartTime = clock.getElapsedTime();
                // 【変更】フィナーレに入ったらスクロールを止める
                state.scrollVelocity = 0;

                new Tween(finaleMat.uniforms.uOpacity)
                    .to({ value: 1.0 }, FINALE_TRANSITION_DURATION)
                    .easing(Easing.Quintic.InOut)
                    .start();

                new Tween(bloomPass)
                    .to({ strength: 3.0 }, FINALE_TRANSITION_DURATION)
                    .easing(Easing.Quintic.InOut)
                    .start();

                lights.forEach(light => {
                    if (!light) return;
                    const newColor = new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 0.9, 0.7);
                    new Tween(light.color)
                        .to({ r: newColor.r, g: newColor.g, b: newColor.b }, FINALE_TRANSITION_DURATION)
                        .easing(Easing.Quintic.InOut)
                        .start();
                    
                    new Tween(light)
                        .to({ intensity: 15, distance: 800 }, FINALE_TRANSITION_DURATION)
                        .easing(Easing.Quintic.InOut)
                        .start();
                });

                const ambientLight = new THREE.AmbientLight(0x6633ff, 0.4);
                scene.add(ambientLight);

                // === ここから格子再配置 ===
                const gridCount = Math.ceil(Math.cbrt(clusterGroups.length));
                const spacing = 300; // 格子間隔
                let idx = 0;
                for (let x = 0; x < gridCount; x++) {
                  for (let y = 0; y < gridCount; y++) {
                    for (let z = 0; z < gridCount; z++) {
                      if (idx >= clusterGroups.length) break;
                      const group = clusterGroups[idx];
                      // 目標座標を保存
                      group.userData.gridTarget = new THREE.Vector3(
                        finaleObj.position.x + (x - gridCount / 2) * spacing,
                        finaleObj.position.y + (y - gridCount / 2) * spacing,
                        finaleObj.position.z + (z - gridCount / 2) * spacing
                      );
                      idx++;
                    }
                  }
                }
                // === ここまで格子再配置 ===

                return true;
            }
            return false;
        };

        const updateFinalePhase = (elapsedTime, finaleTime) => {
            state.cameraOrbit.theta += 0.0005 * (1 + Math.sin(finaleTime * 0.2) * 0.1);
            state.cameraOrbit.phi = Math.PI / 4 + Math.sin(finaleTime * 0.3) * 0.1;
            
            const targetPos = new THREE.Vector3(
                Math.cos(state.cameraOrbit.theta) * Math.sin(state.cameraOrbit.phi) * state.cameraOrbit.radius,
                Math.cos(state.cameraOrbit.phi) * state.cameraOrbit.radius,
                Math.sin(state.cameraOrbit.theta) * Math.sin(state.cameraOrbit.phi) * state.cameraOrbit.radius
            ).add(finaleObj.position);

            camera.position.lerp(targetPos, 0.02);
            camera.lookAt(finaleObj.position);

            lights.forEach((light) => {
                const params = light.userData.orbitParams;
                const time = finaleTime * params.speed;
                const radius = params.radius * (1 + Math.sin(time * 0.2) * 0.1);
                const inclination = params.inclination + Math.sin(time * 0.3) * 0.1;
                
                light.position.set(
                    Math.cos(time + params.phase) * radius * Math.cos(inclination),
                    Math.sin(time + params.phase) * radius,
                    Math.cos(time + params.phase * 2) * radius * Math.sin(inclination)
                ).add(finaleObj.position);
            });

            if (finaleObj?.material?.uniforms) {
                finaleObj.material.uniforms.uTime.value = elapsedTime;
            }
        };

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            tweenUpdate();

            updateGravityField();
            updateParticles();

            fogLayers.forEach((layer, i) => {
                if (layer.material.uniforms) {
                    layer.material.uniforms.uTime.value = elapsedTime;
                    layer.position.y = -200 + i * 50 + Math.sin(elapsedTime * 0.2 + i * 0.5) * 10;
                }
            });

            clusterGroups.forEach((group) => {
                const movement = group.userData.movement;
                if (!movement) return;
                
                group.rotation.x += movement.rotationSpeed.x;
                group.rotation.y += movement.rotationSpeed.y;
                group.rotation.z += movement.rotationSpeed.z;

                if (state.phase === 'FINALE') {
                    const distance = group.position.distanceTo(finaleObj.position);
                    const fadeThreshold = 1000;
                    if (distance < fadeThreshold) {
                        const opacity = Math.max(0, distance / fadeThreshold);
                        if (group.children[0]?.material) {
                            group.children[0].material.opacity = opacity * 0.5;
                        }
                        if (group.children[1]?.material) {
                            group.children[1].material.opacity = opacity * 0.25;
                        }
                    }
                }

                if (state.phase === 'FINALE' && group.userData.gridTarget) {
                    group.position.lerp(group.userData.gridTarget, 0.005); // 小さい値ほどゆっくり
                }
            });

            // 【変更】ナビゲーションフェーズのカメラ制御
            if (state.phase === 'NAVIGATING') {
                // スクロール速度をカメラのZ位置に適用
                camera.position.z += state.scrollVelocity;
                
                // 速度を徐々に減衰させる（慣性・摩擦の効果）
                // この値(0.95)を1に近づけると慣性が強く働き、0に近づけるとすぐに止まる
                state.scrollVelocity *= 0.95; 

                // フィナーレに到達したかチェック
                checkAndTriggerFinale(camera.position.z);
                    
                // 光源の動的生成 (このロジックはカメラ位置に依存するため変更なし)
                if (camera.position.z < state.nextLightSpawnZ && state.dynamicLights.length < MAX_DYNAMIC_LIGHTS) {
                    const color = new THREE.Color().setHSL(Math.random(), 1, 0.75);
                    const light = new THREE.PointLight(color, 6, 350);
                    light.position.set(
                        (Math.random() - 0.5) * 200,
                        (Math.random() - 0.5) * 200,
                        camera.position.z - 400
                    );
                    light.userData.orbitParams = {
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.2 + Math.random() * 0.3,
                        radius: 50 + Math.random() * 100,
                        verticalOffset: Math.random() * Math.PI
                    };
                    state.dynamicLights.push(light);
                    scene.add(light);
                    state.nextLightSpawnZ = camera.position.z - LIGHT_SPAWN_INTERVAL;
                }
            }
            else if (state.phase === 'FINALE') {
                const finaleTime = elapsedTime - state.finaleStartTime;
                updateFinalePhase(elapsedTime, finaleTime);
            }

            composer.render();
        };

        animate();
        
        // 【修正】クリーンアップ関数
        return () => {
            cancelAnimationFrame(frameId);
            // 【追加】イベントリスナーを削除
            currentMount.removeEventListener("wheel", onWheel);

            // --- 以降、元のクリーンアップ処理（変更なし） ---
            state.dynamicLights.forEach(light => {
                if (light?.parent) {
                    light.parent.remove(light);
                }
            });
            state.dynamicLights = [];
            
            clusterGroups.forEach(group => {
                if (group) {
                    scene.remove(group);
                    group.traverse(object => {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(mat => mat.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    });
                }
            });
            clusterGroups.length = 0;
            
            if (finaleObj) {
                if (finaleObj.parent) finaleObj.parent.remove(finaleObj);
                if (finaleObj.geometry) finaleObj.geometry.dispose();
                if (finaleObj.material) finaleObj.material.dispose();
            }
            
            renderer.dispose();
            
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            scene.clear();
            
            if (particleSystem) {
                if (particleSystem.parent) particleSystem.parent.remove(particleSystem);
                if (particleMaterial) particleMaterial.dispose();
                if (particleGeometry) particleGeometry.dispose();
            }

            fogLayers.forEach(layer => {
                if (layer) {
                    if (layer.parent) layer.parent.remove(layer);
                    if (layer.geometry) layer.geometry.dispose();
                    if (layer.material) layer.material.dispose();
                }
            });
            fogLayers.length = 0;

            gravityPoints.forEach(gp => {
                if (gp.visualMesh) {
                    if (gp.visualMesh.parent) gp.visualMesh.parent.remove(gp.visualMesh);
                    if (gp.visualMesh.geometry) gp.visualMesh.geometry.dispose();
                    if (gp.visualMesh.material) gp.visualMesh.material.dispose();
                }
            });
            if (gravitySourceGeometry) gravitySourceGeometry.dispose();
            if (gravitySourceMaterial) gravitySourceMaterial.dispose();


            if (gravityFieldLines) {
                if (gravityFieldLines.parent) gravityFieldLines.parent.remove(gravityFieldLines);
                if (gravityFieldGeometry) gravityFieldGeometry.dispose();
                if (gravityFieldMaterial) gravityFieldMaterial.dispose();
            }

            while (currentMount.firstChild) {
                currentMount.removeChild(currentMount.firstChild);
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                width: "100vw",
                height: "100vh",
                // 【変更】ナビゲーション中はカーソルを表示して操作可能であることを示す
                cursor: state.phase === 'FINALE' ? "auto" : "grab",
                background: "#000",
                overflow: "hidden", // ページ自体のスクロールは防止
                touchAction: "none",
                position: "fixed",
                top: 0,
                left: 0,
                margin: 0,
                padding: 0
            }}
        />
    );
}