import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const ThreeBox5 = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // 軽量コンクリート質感（CanvasTexture）
  const makeConcreteTextures = (size = 256) => {
    const color = document.createElement('canvas');
    color.width = color.height = size;
    const cctx = color.getContext('2d')!;
    const cd = cctx.createImageData(size, size);

    for (let i = 0; i < cd.data.length; i += 4) {
      const n = Math.random();
      const base = 0.10 + n * 0.15;
      const r = base * 0.90, g = base * 0.95, b = base * 1.05;
      cd.data[i] = (r * 255) | 0;
      cd.data[i + 1] = (g * 255) | 0;
      cd.data[i + 2] = (b * 255) | 0;
      cd.data[i + 3] = 255;
    }
    cctx.putImageData(cd, 0, 0);

    const normal = document.createElement('canvas');
    normal.width = normal.height = size;
    const nctx = normal.getContext('2d')!;
    nctx.fillStyle = '#8080ff';
    nctx.fillRect(0, 0, size, size);

    const rough = document.createElement('canvas');
    rough.width = rough.height = size;
    const rctx = rough.getContext('2d')!;
    rctx.fillStyle = '#b0b0b0';
    rctx.fillRect(0, 0, size, size);

    const wrap = THREE.ClampToEdgeWrapping;
    const mk = (cnv: HTMLCanvasElement, linear = false) => {
      const t = new THREE.CanvasTexture(cnv);
      t.wrapS = t.wrapT = wrap;
      t.anisotropy = 2;
      t.colorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
      return t;
    };

    return {
      map: mk(color),
      normalMap: mk(normal, true),
      roughnessMap: mk(rough, true),
    };
  };

  // フレーズ
  const getItohPhrase = () => {
    const phrases = [
      '意識は観測する',
      '言葉が現実を編む',
      '記憶の層が剥がれていく',
      'データの海で溺れる',
      '虚構と現実の境',
      'コードに刻まれた詩',
      'デジタルな祈り',
      '電子的な夢の断片',
      'アルゴリズムの美学',
      'ネットワークに響く声',
      'プログラムされた感情',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // テキストテクスチャ
  const makeTextTexture = (text = 'hello', size = 1024, fontPref?: string, mode: 'default' | 'itoh' = 'default') => {
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = size;
    const ctx = cnv.getContext('2d')!;

    if (mode === 'itoh') text = getItohPhrase();
    ctx.clearRect(0, 0, size, size);

    if (mode === 'itoh') {
      ctx.fillStyle = 'rgba(120,180,255,0.15)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `300 ${size * 0.025}px 'SF Mono', Consolas, monospace`;
      const dataFragments = ['0x4A2F', 'NULL', 'EOF', '#!/usr/bin', 'malloc()', 'free()', 'stack overflow', 'segfault'];
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillText(dataFragments[Math.floor(Math.random() * dataFragments.length)], x, y);
      }
    }

    ctx.fillStyle = mode === 'itoh' ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxW = size * (mode === 'itoh' ? 0.85 : 0.60);
    const boxH = size * (mode === 'itoh' ? 0.50 : 0.40);
    const baseFs = mode === 'itoh' ? 160 : 200;

    const preset = (fontPref || '').toLowerCase();
    const stacks: Record<string, string> = {
      avenir: "'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, 'Noto Sans JP'",
      sf: "'SF Pro Display', -apple-system, system-ui, 'Helvetica Neue', Arial, 'Noto Sans JP'",
      mono: "Menlo, Monaco, 'SF Mono', Consolas, 'Noto Sans Mono', monospace",
      gothic: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', 'Yu Gothic', Meiryo, Arial",
      itoh: "'Hiragino Kaku Gothic ProN', 'Avenir Next', 'SF Pro Display', 'Noto Sans JP', Arial",
      default: "'Avenir Next', Avenir, -apple-system, system-ui, 'Helvetica Neue', Arial, 'Noto Sans JP'",
    };
    const fontStack = stacks[mode === 'itoh' ? 'itoh' : (preset || 'default')];
    const fontWeight = mode === 'itoh' ? '500' : '900';

    ctx.font = `${fontWeight} ${baseFs}px ${fontStack}`;
    let m = ctx.measureText(text);
    const baseW = m.width || (baseFs * text.length);
    const baseH = (m.actualBoundingBoxAscent || baseFs * 0.8) + (m.actualBoundingBoxDescent || baseFs * 0.2);
    const scale = Math.min(boxW / baseW, boxH / baseH);
    const fs = Math.max(12, Math.floor(baseFs * scale));
    ctx.font = `${fontWeight} ${fs}px ${fontStack}`;

    if (mode === 'itoh') {
      ctx.shadowColor = 'rgba(180,220,255,0.8)';
      ctx.shadowBlur = Math.max(2, size * 0.008);
      ctx.lineWidth = Math.max(1, size * 0.002);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeText(text, size / 2, size / 2);
      ctx.shadowColor = 'rgba(158,209,255,0.4)';
      ctx.shadowBlur = size * 0.025;
      ctx.fillText(text, size / 2, size / 2);
      ctx.shadowColor = 'rgba(200,230,255,0.2)';
      ctx.shadowBlur = size * 0.05;
      ctx.fillText(text, size / 2, size / 2);
    } else {
      ctx.shadowColor = 'rgba(158,209,255,0.6)';
      ctx.shadowBlur = Math.max(1, size * 0.015);
      ctx.lineWidth = Math.max(2, size * 0.006);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.strokeText(text, size / 2, size / 2);
      ctx.shadowBlur = size * 0.02;
      ctx.fillText(text, size / 2, size / 2);
    }

    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  // 均一分布の球面点（Fibonacci sphere）
  const generateSpherePoints = (count: number, radius = 1.1, center = new THREE.Vector3(0, 2.0, 0)) => {
    const points: Array<THREE.Vector3> = [];
    const offset = 2 / count;
    const increment = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = ((i * offset) - 1) + offset / 2;
      const r = Math.sqrt(1 - y * y);
      const phi = i * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      points.push(new THREE.Vector3(x, y, z).multiplyScalar(radius).add(center));
    }
    return points;
  };

  // ガラス破片生成
  const createGlassShards = (count = 1000) => {
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const shardType = Math.random();
      let geometry: THREE.BufferGeometry;

      if (shardType < 0.5) {
        const length = 0.008 + Math.random() * 0.012;
        const width = length * 0.1;
        const height = length * (0.8 + Math.random() * 0.4);
        geometry = new THREE.BoxGeometry(width, height, length);
      } else if (shardType < 0.8) {
        const size = 0.005 + Math.random() * 0.008;
        geometry = new THREE.TetrahedronGeometry(size);
      } else if (shardType < 0.95) {
        const size = 0.008 + Math.random() * 0.015;
        const thickness = size * 0.05;
        geometry = new THREE.BoxGeometry(size, size, thickness);
      } else {
        const length = 0.015 + Math.random() * 0.025;
        const radius = length * 0.02;
        geometry = new THREE.CylinderGeometry(radius, radius, length, 6);
      }

      const material = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_refractiveIndex: { value: 1.52 },
          u_dispersion: { value: 0.08 + Math.random() * 0.04 },
          u_opacity: { value: 0.03 + Math.random() * 0.05 },
          u_tint: { value: new THREE.Color().setHSL(0.0, 0.0, 0.95 + Math.random() * 0.05) },
          u_metallic: { value: 0.1 + Math.random() * 0.1 },
          u_clarity: { value: 0.9 + Math.random() * 0.1 },
        },
        vertexShader: /* glsl */`
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying vec3 vViewDirection;
          void main(){
            vec4 wp = modelMatrix * vec4(position,1.0);
            vWorldPosition = wp.xyz;
            vWorldNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(wp.xyz - cameraPosition);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float u_time;
          uniform float u_refractiveIndex;
          uniform float u_dispersion;
          uniform float u_opacity;
          uniform vec3 u_tint;
          uniform float u_metallic;
          uniform float u_clarity;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying vec3 vViewDirection;

          vec3 disperseColor(vec3 direction, vec3 normal, float dispersion) {
            float nR = u_refractiveIndex - dispersion * 0.05;
            float nG = u_refractiveIndex;
            float nB = u_refractiveIndex + dispersion * 0.05;
            vec3 rR = refract(direction, normal, 1.0 / nR);
            vec3 rG = refract(direction, normal, 1.0 / nG);
            vec3 rB = refract(direction, normal, 1.0 / nB);
            float dotR = max(0.0, dot(rR, vec3(0.2, 0.8, 0.0)));
            float dotG = max(0.0, dot(rG, vec3(0.0, 1.0, 0.0)));
            float dotB = max(0.0, dot(rB, vec3(-0.2, 0.8, 0.0)));
            float rainbow = sin(u_time * 0.5 + dot(vWorldPosition, vec3(1.0)) * 2.0) * 0.3 + 0.7;
            return vec3(
              dotR * (0.8 + rainbow * 0.4),
              dotG * (0.9 + rainbow * 0.2),
              dotB * (1.0 + rainbow * 0.3)
            );
          }

          vec3 environmentReflection(vec3 viewDir, vec3 normal) {
            vec3 reflected = reflect(viewDir, normal);
            vec3 envColor = mix(vec3(0.1, 0.2, 0.4), vec3(0.8, 0.9, 1.0), abs(reflected.y) * 0.5 + 0.5);
            float g = dot(envColor, vec3(0.299, 0.587, 0.114));
            return vec3(g);
          }

          void main(){
            vec3 N = normalize(vWorldNormal);
            vec3 V = normalize(vViewDirection);
            float NdotV = abs(dot(N, -V));
            float fresnel = pow(1.0 - NdotV, 1.5);

            vec3 prism = disperseColor(V, N, u_dispersion);
            vec3 env = environmentReflection(V, N);
            vec3 refractionColor = mix(u_tint, prism * 0.3, u_dispersion);
            vec3 reflectionColor = mix(env, vec3(1.0), fresnel * u_metallic);
            vec3 finalColor = mix(refractionColor, reflectionColor, fresnel * u_clarity);

            float edgeSharpness = pow(1.0 - NdotV, 8.0);
            finalColor += vec3(1.0) * edgeSharpness * 0.3;

            float intensity = 0.8 + fresnel * 0.2;
            float alpha = u_opacity * u_clarity + fresnel * 0.2 + edgeSharpness * 0.1;
            gl_FragColor = vec4(finalColor * intensity, clamp(alpha, 0.0, 0.4));
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const roomWidth = 9.0;
      const roomDepth = 9.0;
      const roomHeight = 6.5;

      mesh.position.set(
        (Math.random() - 0.5) * roomWidth,
        Math.random() * (roomHeight + 3.0) + roomHeight * 0.5,
        (Math.random() - 0.5) * roomDepth
      );
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

      mesh.userData = {
        index: i,
        initialPosition: mesh.position.clone(),
        fallSpeed: 2.0,
        rotationSpeed: { x: 0.008, y: 0.012, z: 0.006 },
        startDelay: i * 0.006, // 以前より短縮
        state: 'falling', // 'falling' | 'attracted' | 'formed' | 'floor_static'
        targetPoint: null as THREE.Vector3 | null,
        attraction: 0,
        formingSpeed: 2.2 + Math.random() * 0.8,
        hasFallen: false,
        isForSphere: i < 600, // 先頭600個で球体
        gatherDelay: Math.random() * 2.0, // 集合開始の個体差（0〜2s）
        floorTime: 0, // 床静止経過時間
      };

      shards.push(mesh);
    }
    return shards;
  };

  // ブート文字テクスチャ（縦スクロール）
  const makeBootTexture = (w = 1024, h = 2048) => {
    const cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    const ctx = cnv.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const fs = Math.floor(h * 0.018);
    const mono = "Menlo, Monaco, 'SF Mono', Consolas, 'Noto Sans Mono', monospace";
    ctx.font = `${fs}px ${mono}`;
    const lines = [
      '[ OK ] Mounted /boot/efi',
      '[ OK ] Starting Update UTMP...',
      '[ OK ] Started Daily apt download activities.',
      '[WARN] ACPI: Unsupported device in DSDT',
      '[  12.345678] eth0: link up 1000 Mbps Full Duplex',
      '[  12.987654] EXT4-fs (nvme0n1p3): mounted',
      'init: entering runlevel 5',
      'systemd[1]: Reached target Graphical Interface',
      'udevd[221]: starting eudev-3.2.9',
      '[ FAIL ] Failed to start Optional Service',
    ];
    const rand = (a:number,b:number)=>a+Math.random()*(b-a);
    let y = 0;
    while (y < h) {
      const line = lines[Math.floor(Math.random()*lines.length)] + ' #' + Math.floor(rand(1000,9999));
      ctx.fillText(line, Math.floor(w*0.04), Math.floor(y));
      y += Math.floor(fs * rand(1.05, 1.35));
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default' });
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    container.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.07);

    const camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.05, 100);
    camera.position.set(0, 1.35, 6.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 7;
    controls.minPolarAngle = Math.PI * 0.35;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.set(0, 1.05, -0.2);

    // Materials
    const conc = makeConcreteTextures(128);

    // Room (inside)
    const roomW = 10, roomH = 6.5, roomD = 10;
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, roomH, roomD),
      new THREE.MeshStandardMaterial({
        map: conc.map,
        normalMap: conc.normalMap,
        roughnessMap: conc.roughnessMap,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.BackSide,
      })
    );
    room.position.y = roomH / 2;
    scene.add(room);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      new THREE.MeshStandardMaterial({
        map: conc.map, normalMap: conc.normalMap, roughnessMap: conc.roughnessMap,
        roughness: 1.0, metalness: 0.0, color: new THREE.Color(0x0b0f13),
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    scene.add(floor);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.1);
    scene.add(hemi);

    // Screen (reflector)
    const screenW = 4.2, screenH = 2.6;
    const screenY = 1.6;
    const screenGeo = new THREE.PlaneGeometry(screenW, screenH, 48, 48);
    const screen = new Reflector(screenGeo, {
      textureWidth: Math.max(256, Math.floor(rect.width)),
      textureHeight: Math.max(256, Math.floor(rect.height)),
      color: 0x9bb7ff,
      clipBias: 0.003,
    });
    screen.position.set(0, screenY, -(roomD / 2 - 0.20) + 0.02);
    scene.add(screen);

    // Save base positions for ripple deformation
    const posAttrRef = screen.geometry.attributes.position as THREE.BufferAttribute;
    const basePosRef = (posAttrRef.array as Float32Array).slice();

    // Emissive overlay (shader)
    const emissiveGeo = new THREE.PlaneGeometry(screenW, screenH, 48, 48);
    const emissiveMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(0x9ed1ff) },
        u_intensity: { value: 1.0 },
        u_center: { value: new THREE.Vector2(0.5, 0.5) },
        u_uvAspect: { value: new THREE.Vector2(1.0, 1.0) },
        u_text: { value: null as THREE.Texture | null },
        u_aspect: { value: 1.0 },
        u_boot: { value: null as THREE.Texture | null },
        u_bootOffset: { value: 0.0 },
        u_bootAlpha: { value: 0.15 },
        u_mode: { value: 0.0 },
        u_typeProgress: { value: 1.0 },
        u_textFade: { value: 1.0 },
        u_philosophy: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_color;
        uniform float u_intensity;
        uniform float u_time;
        uniform vec2 u_center;
        uniform vec2 u_uvAspect;
        uniform sampler2D u_text;
        uniform float u_aspect;
        uniform sampler2D u_boot;
        uniform float u_bootOffset;
        uniform float u_bootAlpha;
        uniform float u_mode;
        uniform float u_typeProgress;
        uniform float u_textFade;
        uniform float u_philosophy;
        float hash12(vec2 p){
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        float ring(float r, float t){
          float x1 = r - 0.35 * t; float s1 = sin(14.0 * x1) * exp(- (x1*x1) / (2.0 * 0.11 * 0.11));
          float x2 = r - 0.58 * t; float s2 = sin(22.0 * x2) * exp(- (x2*x2) / (2.0 * 0.09 * 0.09));
          float x3 = r - 0.82 * t; float s3 = sin(36.0 * x3) * exp(- (x3*x3) / (2.0 * 0.07 * 0.07));
          return 0.55*s1 + 0.35*s2 + 0.22*s3;
        }
        float philosophicalDepth(vec2 uv, float time, float depth) {
          float layers = 0.0;
          for(float i=1.0;i<=3.0;i++){
            float freq = i * 2.0 + depth * 0.5;
            float phase = time * (0.3 + i * 0.1) + depth * 3.14159;
            float wave = sin(uv.x * freq + phase) * sin(uv.y * freq * 0.7 + phase * 1.2);
            layers += wave / (i * i);
          }
          return smoothstep(-0.3, 0.3, layers) * 0.4;
        }
        float typewriterEffect(vec2 uv, float progress) {
          float horizontal = smoothstep(0.0, 1.0, (uv.x + uv.y * 0.1) / 1.1);
          return smoothstep(progress - 0.1, progress + 0.1, horizontal);
        }
        void main(){
          float g = (hash12(vUv*vec2(640.0,360.0) + u_time*0.7)-0.5)*0.06;
          float r = distance(vUv, vec2(0.5));
          float vign = smoothstep(0.9, 0.25, 1.0 - r);
          vec2 d = (vUv - u_center) * u_uvAspect;
          float rr = length(d);
          float ripple = ring(rr, u_time);
          float rippleMask = clamp(0.5 + 0.5 * ripple, 0.0, 1.4);
          vec3 col = u_color * (0.78 + 0.22*vign + g);
          if(u_mode > 0.5){
            col = mix(col, vec3(0.85,0.92,1.0), 0.3);
            float depth = philosophicalDepth(vUv, u_time, u_philosophy);
            col += vec3(0.1,0.15,0.2) * depth;
          }
          float I = u_intensity * mix(0.85, 1.25, rippleMask);
          vec2 uvSq = (vUv - 0.5) * vec2(1.0 / max(u_aspect,1.0), 1.0 / max(1.0, 1.0/u_aspect)) + 0.5;
          float tmask = texture2D(u_text, uvSq).a;
          float typeEffect = typewriterEffect(uvSq, u_typeProgress);
          tmask *= typeEffect;
          tmask *= u_textFade;
          if(u_mode > 0.5){
            float inner = smoothstep(0.3, 0.8, tmask);
            float halo = clamp(tmask - inner, 0.0, 1.0);
            float glow = smoothstep(0.1, 0.6, tmask);
            col = mix(col, vec3(0.05,0.08,0.12), inner * 0.9);
            col = mix(col, vec3(0.9,0.95,1.0), halo * 0.6);
            col += vec3(0.3,0.4,0.6) * glow * 0.2;
            I = mix(I, I * 0.7, inner);
            I += glow * 0.3;
          }else{
            float inner = smoothstep(0.4, 0.85, tmask);
            float halo = clamp(tmask - inner, 0.0, 1.0);
            col = mix(col, vec3(0.0), inner);
            col = mix(col, vec3(1.0), 0.10 * halo);
            I = mix(I, I * 0.65, inner);
          }
          vec2 bootUV = vec2(uvSq.x, fract(uvSq.y + u_bootOffset));
          float b = texture2D(u_boot, bootUV).r;
          I += u_bootAlpha * b;
          gl_FragColor = vec4(col * I, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const emissive = new THREE.Mesh(emissiveGeo, emissiveMat);
    emissive.position.copy(screen.position);
    emissive.position.z += 0.001;
    emissive.renderOrder = 2;
    scene.add(emissive);
    const posAttrEmi = emissive.geometry.attributes.position as THREE.BufferAttribute;
    const basePosEmi = (posAttrEmi.array as Float32Array).slice();

    // Boot texture
    const bootTex = makeBootTexture(1024, 2048);
    emissiveMat.uniforms.u_boot.value = bootTex;

    // URL params
    let screenText = 'hello';
    let fontPref: string | undefined = undefined;
    let displayMode: 'default' | 'itoh' = 'default';
    let autoItoh = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('text'); if (q) screenText = decodeURIComponent(q);
      const f = params.get('font'); if (f) fontPref = decodeURIComponent(f);
      const m = params.get('mode'); if (m && (m === 'itoh' || m === 'project_itoh')) displayMode = 'itoh';
      const a = params.get('auto'); if (a === 'true' || a === '1') autoItoh = true;
    } catch {}

    const isItohMode = displayMode === 'itoh' || autoItoh;
    emissiveMat.uniforms.u_mode.value = isItohMode ? 1.0 : 0.0;
    emissiveMat.uniforms.u_text.value = makeTextTexture(screenText, 1024, fontPref, isItohMode ? 'itoh' : 'default');
    emissiveMat.uniforms.u_aspect.value = screenW / screenH;

    // Lights continued
    const spot = new THREE.SpotLight(0xbfd8ff, 0.0, 0, Math.PI * 0.35, 0.6, 1.2);
    const spotTarget = new THREE.Object3D();
    spot.position.copy(camera.position);
    spotTarget.position.set(0, screenY, screen.position.z);
    scene.add(spot); scene.add(spotTarget); spot.target = spotTarget;

    const bezel = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW + 0.24, screenH + 0.24),
      new THREE.MeshStandardMaterial({ color: 0x05090c, roughness: 1.0, metalness: 0.0 })
    );
    bezel.position.copy(screen.position);
    bezel.position.z -= 0.01;
    scene.add(bezel);

    RectAreaLightUniformsLib.init();
    const area = new THREE.RectAreaLight(0xffffff, 3.0, screenW, screenH);
    area.position.copy(screen.position);
    area.position.z += 0.05;
    area.lookAt(0, 1.0, 0.7);
    scene.add(area);

    // === 球体の形成 ===
    // ガラス破片
    const glassShards = createGlassShards(1000);
    const glassGroup = new THREE.Group();
    glassShards.forEach(m => glassGroup.add(m));
    scene.add(glassGroup);

    // 球面ポイント（isForSphere の数に合わせて生成）
    const sphereShardCount = glassGroup.children.filter((m: any) => m.userData.isForSphere).length;
    const spherePoints = generateSpherePoints(sphereShardCount, 1.15, new THREE.Vector3(0, 2.0, 0));

    // ポイントをシャッフルして帯状配置を避ける
    const shuffledPoints = [...spherePoints];
    for (let i = shuffledPoints.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [shuffledPoints[i], shuffledPoints[j]] = [shuffledPoints[j], shuffledPoints[i]];
    }

    // 破片 → 球面ポイント割り当て（キーは shard.uuid でミスなく参照）
    const assignments = new Map<string, THREE.Vector3>();
    let assignIdx = 0;
    glassGroup.children.forEach((shard: any) => {
      if (shard.userData.isForSphere && assignIdx < shuffledPoints.length) {
        assignments.set(shard.uuid, shuffledPoints[assignIdx++]);
      }
    });

    // 球の「存在感」を補助する微光ワイヤー球（表現強化）
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1.155, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x9ed1ff, wireframe: true, transparent: true, opacity: 0.05 })
    );
    wire.position.set(0, 2.0, 0);
    wire.renderOrder = 1;
    scene.add(wire);

    // PostProcess
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(rect.width, rect.height), 0.5, 0.4, 0.3);
    composer.addPass(bloom);

    const VignetteShader = {
      uniforms: { tDiffuse: { value: null as any }, strength: { value: 0.55 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;
        void main(){
          vec4 col = texture2D(tDiffuse, vUv);
          vec2 p = vUv - 0.5;
          float d = length(p)*1.4142;
          float v = smoothstep(0.45, 1.0, d);
          col.rgb *= mix(1.0, 1.0 - strength, v);
          gl_FragColor = col;
        }
      `,
    };
    composer.addPass(new ShaderPass(VignetteShader as any));

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height);
      composer.setSize(r.width, r.height);
      bloom.setSize(r.width, r.height);
    };
    window.addEventListener('resize', handleResize);

    // Animate
    const clock = new THREE.Clock();
    let lastTime = 0;
    const tmpTarget = new THREE.Vector3(0, screenY, screen.position.z);

    // 破片の集合開始時刻（落下して積もる時間を確保）
    const gatherStartBase = 3.5; // 秒

    const tick = () => {
      animationIdRef.current = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const dt = t - lastTime;
      lastTime = t;
      controls.update();

      // スクリーンの波紋
      if (posAttrRef && posAttrEmi) {
        const arrR = posAttrRef.array as Float32Array;
        const arrE = posAttrEmi.array as Float32Array;
        const amp = 0.006;
        const cx = 0.15 * Math.sin(t * 0.12);
        const cy = 0.10 * Math.cos(t * 0.09 + 0.7);
        const nx = 1.0 / (screenW * 0.5);
        const ny = 1.0 / (screenH * 0.5);
        const ring = (r: number, tt: number) => {
          const x1 = r - 0.35 * tt, s1 = Math.sin(14.0 * x1) * Math.exp(- (x1 * x1) / (2 * 0.11 * 0.11));
          const x2 = r - 0.58 * tt, s2 = Math.sin(22.0 * x2) * Math.exp(- (x2 * x2) / (2 * 0.09 * 0.09));
          const x3 = r - 0.82 * tt, s3 = Math.sin(36.0 * x3) * Math.exp(- (x3 * x3) / (2 * 0.07 * 0.07));
          return 0.55 * s1 + 0.35 * s2 + 0.22 * s3;
        };
        const edgeFalloff = (r:number) => 1.0 - THREE.MathUtils.smoothstep(r, 0.78, 1.08);
        for (let i = 0; i < arrR.length; i += 3) {
          const x = basePosRef[i + 0];
          const y = basePosRef[i + 1];
          const z0R = basePosRef[i + 2];
          const rx = (x * nx - cx);
          const ry = (y * ny - cy);
          const r = Math.hypot(rx, ry);
          const s = ring(r, t) * edgeFalloff(r);
          const dz = amp * s;
          arrR[i + 2] = z0R + dz;
          const z0E = basePosEmi[i + 2];
          arrE[i + 2] = z0E + dz;
        }
        posAttrRef.needsUpdate = true;
        posAttrEmi.needsUpdate = true;
        screen.geometry.computeVertexNormals();
        emissive.geometry.computeVertexNormals();
      }

      emissiveMat.uniforms.u_time.value = t;
      emissiveMat.uniforms.u_center.value.set(0.5 + 0.5 * (0.15 * Math.sin(t * 0.12)), 0.5 + 0.5 * (0.10 * Math.cos(t * 0.09 + 0.7)));
      emissiveMat.uniforms.u_uvAspect.value.set(1.0, screenH / screenW);
      emissiveMat.uniforms.u_bootOffset.value = (t * 0.06) % 1.0;

      if (isItohMode) {
        const typeSpeed = 0.3;
        const typeCycle = 8.0;
        const phase = (t * typeSpeed) % typeCycle;
        let prog = 1.0;
        if (phase < 6.0) prog = THREE.MathUtils.smoothstep(0.0, 6.0, phase);
        else {
          prog = 1.0 - THREE.MathUtils.smoothstep(6.0, 7.0, phase);
          if (phase > 7.5) emissiveMat.uniforms.u_text.value = makeTextTexture('', 1024, fontPref, 'itoh');
        }
        emissiveMat.uniforms.u_typeProgress.value = prog;
        const philosophyDepth = Math.sin(t * 0.08) * 0.5 + 0.5;
        emissiveMat.uniforms.u_philosophy.value = philosophyDepth;
        const textFade = 0.7 + 0.3 * Math.sin((t * 0.15) % (Math.PI * 2));
        emissiveMat.uniforms.u_textFade.value = textFade;
      } else {
        emissiveMat.uniforms.u_typeProgress.value = 1.0;
        emissiveMat.uniforms.u_textFade.value = 1.0;
        emissiveMat.uniforms.u_philosophy.value = 0.0;
      }

      area.intensity = 3.0;
      emissiveMat.uniforms.u_intensity.value = 0.8;

      // 近接制御
      const distCT = camera.position.distanceTo(controls.target);
      const nearD = controls.minDistance;
      const farD = controls.minDistance + 1.2;
      const closeFactor = 1.0 - THREE.MathUtils.clamp((distCT - nearD) / (farD - nearD), 0.0, 1.0);
      spot.position.copy(camera.position);
      tmpTarget.set(0, screenY, screen.position.z);
      spot.target.position.copy(tmpTarget);
      spot.intensity = 8.0 * closeFactor;
      ambient.intensity = 0.15 + 0.05 * closeFactor;

      // 壁面ウォッシュ（左右）
      //（以前のwashL/washR は不要可：全体明度はambient/spotで十分）

      // ガラス破片の挙動
      glassGroup.children.forEach((shard: any, idx: number) => {
        const ud = shard.userData as any;
        const elapsed = Math.max(0, t - ud.startDelay);

        // 回転
        const rotMul = ud.state === 'formed' ? 0.1 : ud.state === 'attracted' ? 0.3 : 1.0;
        shard.rotation.x = elapsed * ud.rotationSpeed.x * rotMul;
        shard.rotation.y = elapsed * ud.rotationSpeed.y * rotMul;
        shard.rotation.z = elapsed * ud.rotationSpeed.z * rotMul;

        const assigned = assignments.get(shard.uuid);

        // まず全破片を落下させ床に積もらせる
        if (ud.state === 'falling' && !ud.hasFallen) {
          const newY = ud.initialPosition.y - elapsed * ud.fallSpeed;
          if (newY <= 0.05) {
            shard.position.y = 0.05;
            ud.hasFallen = true;
            ud.state = 'floor_static';
            ud.floorTime = 0;
          } else {
            shard.position.y = newY;
          }
        }

        // 集合フェーズに入ったら、割り当て済み破片のみ吸引開始
        const canAttract = assigned && ud.hasFallen && (t > (gatherStartBase + ud.gatherDelay)) && (ud.floorTime > 0.6);
        if (canAttract) {
          if (ud.state === 'floor_static') {
            ud.state = 'attracted';
            ud.attraction = 0.0;
          }
        }

        if (assigned && ud.state === 'attracted') {
          ud.attraction = Math.min(1.0, ud.attraction + 0.025);
          const speed = (0.02 + ud.attraction * 0.06) * (ud.formingSpeed * 0.5);
          shard.position.lerp(assigned, speed * 0.016); // 60fps 基準の補正
          if (shard.position.distanceTo(assigned) < 0.04) {
            ud.state = 'formed';
            ud.targetPoint = assigned.clone();
          }
        } else if (assigned && ud.state === 'formed' && ud.targetPoint) {
          const micro = 0.0045;
          shard.position.set(
            ud.targetPoint.x + Math.sin(t * 1.2 + idx * 0.1) * micro,
            ud.targetPoint.y + Math.cos(t * 1.5 + idx * 0.1) * micro,
            ud.targetPoint.z + Math.sin(t * 1.8 + idx * 0.1) * micro
          );
        } else if (ud.state === 'floor_static') {
          // 非参加 or 集合前は床で微振動
          shard.position.y = 0.05 + Math.sin(t * 2.0 + idx) * 0.002;
          ud.floorTime += dt;
        }

        // シェーダー更新を間引き
        if (idx % 30 === 0 && shard.material && shard.material.uniforms) {
          shard.material.uniforms.u_time.value = t;
        }
      });

      composer.render();
    };
    tick();

    // refs
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    composerRef.current = composer;

    // cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', background: '#000' }}
    />
  );
};

export default ThreeBox5;
