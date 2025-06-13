// ThreeSeaScene.jsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useWindowSize } from '@react-hook/window-size';


// Three.js公式リポジトリの特定バージョンに固定した、最も安定したURL
const WATER_NORMALS_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r154/examples/textures/waternormals.jpg';

// 安定したCDN経由で読み込む、高解像度（2K）の月のテクスチャ
const MOON_TEXTURE_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/moon_1024.jpg';

export default function ThreeSeaScene() {
  const mountRef = useRef(null);
  const [winW, winH] = useWindowSize();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cameraMode, setCameraMode] = useState('fixed'); // 'fixed' or 'thirdPerson'

  // Store Three.js objects in refs to avoid re-creation
  const sceneRef = useRef({}).current;

  // ===== Sun Position Calculation (for Ginowan, Okinawa) =====
  /**
   * Calculates the sun's spherical coordinates (phi, theta) for a given time and location.
   * @param {Date} date - The current date object.
   * @param {number} latitude - Latitude of the location in degrees.
   * @returns {{phi: number, theta: number}} - Sun angles in radians.
   */
  const getSunAngles = (date, latitude) => {
    const hours = date.getHours() + date.getMinutes() / 60;
    const declination = -23.45 * Math.cos( (2 * Math.PI / 365) * (date.getDate() + 10) );
    const hourAngle = (hours - 12) * 15;

    const latRad = THREE.MathUtils.degToRad(latitude);
    const decRad = THREE.MathUtils.degToRad(declination);
    const hourRad = THREE.MathUtils.degToRad(hourAngle);

    const altitude = Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad)
    );
    
    const azimuth = Math.acos(
      (Math.sin(decRad) - Math.sin(altitude) * Math.sin(latRad)) /
      (Math.cos(altitude) * Math.cos(latRad))
    );
    
    const theta = (hours > 12) ? azimuth : 2 * Math.PI - azimuth;
    const phi = Math.PI / 2 - altitude;

    return { phi, theta };
  };
  
  /** Time of day 0–24 → night factor 0-1 (0=day, 1=night) */
  const getNightFactor = (h) => {
    const h_shifted = (h + 6) % 24; // Shift so 6:00 is the start
    return 0.5 - 0.5 * Math.cos((h_shifted / 24) * Math.PI * 2);
  };

  // ===== Scroll Event Handler =====
  useEffect(() => {
    const handleScroll = (event) => {
      // スクロールイベントをキャプチャして、デフォルトのスクロールを防止
      event.preventDefault();
      
      // マウスホイールのデルタ値を取得
      const delta = event.deltaY;
      
      // 現在のスクロール進捗を更新（-0.00001から0.00001の範囲で制限）
      setScrollProgress(prev => {
        const newProgress = prev + (delta * 0.00001); // より細かく
        return Math.min(Math.max(newProgress, 0), 1);
      });
    };

    // スクロールイベントリスナーを追加
    window.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleScroll);
    };
  }, []);

  // ===== Main Three.js Effect =====
  useEffect(() => {
    if (!mountRef.current || sceneRef.isInitialized) return;

    // ===== Scene / Camera / Renderer =====
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, winW / winH, 1, 20000);
    // カメラの初期位置をカメラモードによって変更
    if (cameraMode === 'thirdPerson') {
      camera.position.set(0, 3000, 6000); // さらに遠く高い位置に固定
    } else {
      camera.position.set(0, 300, 400);
    }
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(winW, winH);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    mountRef.current.appendChild(renderer.domElement);
    
    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    
    // カメラモードに応じて制限を設定
    const updateCameraConstraints = () => {
      if (cameraMode === 'fixed') {
        controls.minDistance = 500;
        controls.maxDistance = 500;
        controls.minPolarAngle = Math.PI / 3;
        controls.maxPolarAngle = Math.PI / 2;
        controls.panSpeed = 0;
        controls.zoomSpeed = 0;
        controls.rotateSpeed = 0.3;
      } else {
        controls.minDistance = 12000;
        controls.maxDistance = 12000;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.panSpeed = 1;
        controls.zoomSpeed = 0;
        controls.rotateSpeed = 1;
        controls.target.set(0, 0, 0);
        camera.position.set(0, 3000, 6000); // 切り替え時も必ずこの位置
      }
      controls.update();
    };

    updateCameraConstraints();
    
    // 注視点の設定
    controls.target.set(0, 0, 0);
    controls.update();
    
    sceneRef.controls = controls;
    sceneRef.updateCameraConstraints = updateCameraConstraints;
    
    // Store objects for cleanup and updates
    sceneRef.scene = scene;
    sceneRef.camera = camera;
    sceneRef.renderer = renderer;

    // ===== Water =====
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(waterGeometry, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals: new THREE.TextureLoader().load(WATER_NORMALS_URL, (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.0,
      fog: scene.fog !== undefined,
    });
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    sceneRef.water = water;

    // ===== Skybox =====
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    sceneRef.sky = sky;

    // ===== Lights =====
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(sunLight);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    sceneRef.sunLight = sunLight;
    sceneRef.ambientLight = ambientLight;
    
    // ===== Moon =====
    const moonTexture = new THREE.TextureLoader().load(MOON_TEXTURE_URL);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 32),
      new THREE.MeshStandardMaterial({
        map: moonTexture,
        emissiveMap: moonTexture,
        emissive: 0xffffff,
        emissiveIntensity: 0.05,
      })
    );
    scene.add(moon);
    sceneRef.moon = moon;

    // Add a light to the moon to cast a subtle glow on the water
    const moonGlow = new THREE.PointLight(0xb1c8ff, 0.5, 2000, 2);
    moon.add(moonGlow);
    sceneRef.moonGlow = moonGlow;

    // ===== Stars =====
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = THREE.MathUtils.randFloatSpread(2000);
      const y = THREE.MathUtils.randFloatSpread(2000);
      const z = THREE.MathUtils.randFloatSpread(2000);
      const d = Math.sqrt(x*x + y*y + z*z);
      if (d > 500 && d < 4000) starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: true })
    );
    scene.add(stars);
    sceneRef.stars = stars;
    
    // ===== PMREM Generator for reflections =====
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    let renderTarget;
    
    const updateEnvironment = () => {
        const sun = new THREE.Vector3();
        sun.copy(sky.material.uniforms['sunPosition'].value);
        if (renderTarget) renderTarget.dispose();
        renderTarget = pmremGenerator.fromScene(sky);
        scene.environment = renderTarget.texture;
    };
    
    updateEnvironment();
    sceneRef.pmremGenerator = pmremGenerator;
    sceneRef.updateEnvironment = updateEnvironment;

    // Mark as initialized
    sceneRef.isInitialized = true;

    // ===== Cleanup Function =====
    return () => {
      // Cancel animation frame, remove renderer
      cancelAnimationFrame(sceneRef.frameId);
      mountRef.current?.removeChild(renderer.domElement);
      
      // Dispose of controls
      controls.dispose();
      
      // Dispose of all scene objects
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      pmremGenerator.dispose();
      renderer.dispose();
      if(renderTarget) renderTarget.dispose();
      sceneRef.isInitialized = false;
    };
  }, [winW, winH, cameraMode]); // Re-run only on window resize or camera mode change

  // ===== Animation Loop =====
  useEffect(() => {
    if (!sceneRef.isInitialized) return;

    const {
      scene, renderer, camera, water, sky, sunLight, ambientLight,
      moon, moonGlow, stars, updateEnvironment, controls, updateCameraConstraints
    } = sceneRef;
      
    // Location: Ginowan, Okinawa
    const LATITUDE = 26.28; 

    let lastEnvUpdate = 0;

    const animate = () => {
      const time = performance.now() * 0.001;
      
      // Update controls
      controls.update();
      
      // Calculate current time of day based on scroll (0-24 hours)
      const h = scrollProgress * 24;
      const date = new Date();
      date.setHours(Math.floor(h));
      date.setMinutes(Math.floor((h % 1) * 60));
      date.setSeconds(Math.floor((((h % 1) * 60) % 1) * 60));

      // Get sun position
      const { phi, theta } = getSunAngles(date, LATITUDE);
      const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      
      // Update sky
      sky.material.uniforms['sunPosition'].value.copy(sunPosition);
      
      // Update water
      water.material.uniforms['time'].value += 1.0 / 60.0;
      water.material.uniforms['sunDirection'].value.copy(sunPosition).normalize();
      
      // Update lights & environment based on time of day
      const nightFactor = getNightFactor(h);

      // Turbidity & Rayleigh for dramatic sunrise/sunset
      sky.material.uniforms['turbidity'].value = THREE.MathUtils.lerp(10, 3, nightFactor);
      sky.material.uniforms['rayleigh'].value = THREE.MathUtils.lerp(2, 0.2, nightFactor * 1.5);

      // Dynamic light colors for sunrise/sunset
      const sunColor = new THREE.Color().setHSL(0.1, 1.0, 0.95);
      const sunsetColor = new THREE.Color().setHSL(0.0, 0.7, 0.5);
      const dayNightBlend = Math.sin(THREE.MathUtils.clamp(phi, 0, Math.PI)); // 0 at noon, 1 at horizon
      sunLight.color.lerpColors(sunColor, sunsetColor, dayNightBlend**2);
      
      // Dynamic water color
      const waterDayColor = new THREE.Color(0x003e52);
      const waterNightColor = new THREE.Color(0x000508);
      water.material.uniforms['waterColor'].value.lerpColors(waterDayColor, waterNightColor, nightFactor);
      
      // Adjust intensity of lights
      sunLight.intensity = THREE.MathUtils.lerp(1.5, 0, nightFactor);
      ambientLight.intensity = THREE.MathUtils.lerp(0.5, 0.01, nightFactor);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(0.6, 0.2, nightFactor);
      
      // Moon position (opposite to the sun) and visibility
      const moonPosition = sunPosition.clone().multiplyScalar(-4000);
      moon.position.copy(moonPosition);
      moonGlow.intensity = THREE.MathUtils.smoothstep(nightFactor, 0.5, 1.0) * 2.0;
      moon.visible = nightFactor > 0.5;

      // Stars visibility
      stars.material.opacity = THREE.MathUtils.smoothstep(nightFactor, 0.4, 0.9);
      stars.material.transparent = true;

      // Update environment map only near sunrise/sunset to save performance
      if (Math.abs(time - lastEnvUpdate) > 1 && (dayNightBlend > 0.95 || lastEnvUpdate === 0)) {
        updateEnvironment();
        lastEnvUpdate = time;
      }
      
      renderer.render(scene, camera);
      sceneRef.frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(sceneRef.frameId);
    };
  }, [scrollProgress, sceneRef.isInitialized, cameraMode]); // Re-run loop logic when scroll or initialization state changes

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: '80px',
        left: 0,
        width: '100%',
        height: 'calc(100vh - 80px)',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          pointerEvents: 'none',
          width: '100%',
          height: '100%'
        }}
      >
        <button
          onClick={() => setCameraMode(prev => prev === 'fixed' ? 'thirdPerson' : 'fixed')}
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(5px)',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            outline: 'none',
            pointerEvents: 'auto'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          {cameraMode === 'fixed' ? 'サードパーソンビュー' : '固定ビュー'}
        </button>
      </div>
    </div>
  );
}