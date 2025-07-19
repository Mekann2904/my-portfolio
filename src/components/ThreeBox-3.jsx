import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODEL_PATH = '/model/CoffeeMachine/';
const OBJ_FILE = 'CoffeeMaker.obj';
const TEXTURES = {
  map: MODEL_PATH + 'Mat_Base_Color.png',
  roughnessMap: MODEL_PATH + 'Mat_Roughness.png',
  metalnessMap: MODEL_PATH + 'Mat_Metallic.png',
  normalMap: MODEL_PATH + 'Mat_Normal_DirectX.png',
  aoMap: MODEL_PATH + 'Mat_Mixed_AO.png',
};

const ThreeBox = () => {
  const mountRef = useRef(null);
  const [usePBR, setUsePBR] = useState(true);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181818);
    const container = mountRef.current;
    const width = container.clientWidth || container.offsetWidth || 800;
    const height = container.clientHeight || container.offsetHeight || 600;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(2.5, 2.5, 4.5);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 1, 0);
    controls.update();

    // ライティング強化
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    // 補助ライト
    const fillLight = new THREE.PointLight(0xffffff, 0.7, 20);
    fillLight.position.set(-5, 4, 5);
    scene.add(fillLight);

    // 地面の最適化
    const groundGeometry = new THREE.PlaneGeometry(12, 12);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // テクスチャローダー
    const textureLoader = new THREE.TextureLoader();
    const loadedTextures = {};
    if (usePBR) {
      for (const key in TEXTURES) {
        loadedTextures[key] = textureLoader.load(TEXTURES[key]);
        // sRGB変換（色味が正しくなるのはmapのみ）
        if (key === 'map') loadedTextures[key].colorSpace = THREE.SRGBColorSpace;
      }
    }

    // OBJモデルの読み込み
    let obj;
    const objLoader = new OBJLoader();
    objLoader.setPath(MODEL_PATH);
    objLoader.load(OBJ_FILE, (object) => {
      obj = object;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (usePBR) {
            child.material = new THREE.MeshStandardMaterial({
              map: loadedTextures.map,
              roughnessMap: loadedTextures.roughnessMap,
              metalnessMap: loadedTextures.metalnessMap,
              normalMap: loadedTextures.normalMap,
              aoMap: loadedTextures.aoMap,
              roughness: 0.8,
              metalness: 0.7,
              color: 0xffffff,
            });
          } else {
            child.material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.2 });
          }
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      adjustObject(obj);
      scene.add(obj);
    });

    // モデルの座標・スケール調整
    function adjustObject(object) {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const minY = box.min.y;
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim;
      object.scale.multiplyScalar(scale);
      object.position.sub(center.multiplyScalar(scale));
      object.position.y -= minY * scale;
    }

    // アニメーション
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // リサイズ対応
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      if (obj) scene.remove(obj);
      container.removeChild(renderer.domElement);
    };
  }, [usePBR]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <button
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
          padding: '8px 16px',
          background: '#222',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem',
          opacity: 0.85
        }}
        onClick={() => setUsePBR((v) => !v)}
      >
        {usePBR ? 'PBRテクスチャOFF' : 'PBRテクスチャON'}
      </button>
    </div>
  );
};

export default ThreeBox;
