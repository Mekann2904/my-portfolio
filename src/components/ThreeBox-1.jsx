import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ThreeBox = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const currentLightRef = useRef(0);
  const currentViewRef = useRef(0);
  const currentDistanceRef = useRef(5);
  const cubeRef = useRef(null);
  const wheelTimeoutRef = useRef(null);
  const [currentLightName, setCurrentLightName] = useState('');
  const [currentViewName, setCurrentViewName] = useState('');
  const [currentDistance, setCurrentDistance] = useState(5);
  const [isOrbitMode, setIsOrbitMode] = useState(false);

  useEffect(() => {
    // シーンの設定
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // カメラの設定
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // レンダラーの設定
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControlsの設定
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI;
    controlsRef.current = controls;

    // ジオメトリの作成
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.4,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // 光源の配列
    const lights = [
      // 環境光
      () => {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        return { 
          light: ambientLight, 
          name: '環境光 (AmbientLight)',
          helper: null
        };
      },
      // 平行光源
      () => {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        const helper = new THREE.DirectionalLightHelper(directionalLight, 1);
        return { 
          light: directionalLight, 
          name: '平行光源 (DirectionalLight)',
          helper: helper
        };
      },
      // 点光源
      () => {
        const pointLight = new THREE.PointLight(0xffffff, 100, 100);
        pointLight.position.set(5, 5, 5);
        const helper = new THREE.PointLightHelper(pointLight, 0.5);
        return { 
          light: pointLight, 
          name: '点光源 (PointLight)',
          helper: helper
        };
      },
      // スポットライト
      () => {
        const spotLight = new THREE.SpotLight(0xffffff, 100);
        spotLight.position.set(5, 5, 5);
        spotLight.angle = Math.PI / 3;
        spotLight.penumbra = 0.2;
        spotLight.decay = 1;
        spotLight.distance = 50;
        const helper = new THREE.SpotLightHelper(spotLight);
        return { 
          light: spotLight, 
          name: 'スポットライト (SpotLight)',
          helper: helper
        };
      },
      // 半球光源
      () => {
        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
        const helper = new THREE.HemisphereLightHelper(hemisphereLight, 1);
        return { 
          light: hemisphereLight, 
          name: '半球光源 (HemisphereLight)',
          helper: helper
        };
      },
    ];

    // 視点の配列
    const views = [
      {
        name: '二人称',
        getPosition: (distance) => new THREE.Vector3(0, 0, distance),
        getLookAt: () => new THREE.Vector3(0, 0, 0)
      },
      {
        name: '三人称',
        getPosition: (distance) => new THREE.Vector3(distance, distance, distance),
        getLookAt: () => new THREE.Vector3(0, 0, 0)
      }
    ];

    let currentLight = null;
    let currentHelper = null;

    // 光源を切り替える関数
    const changeLight = (direction) => {
      const newIndex = (currentLightRef.current + direction + lights.length) % lights.length;
      currentLightRef.current = newIndex;
      
      // 現在の光源とヘルパーを削除
      if (currentLight) {
        scene.remove(currentLight);
      }
      if (currentHelper) {
        scene.remove(currentHelper);
      }
      
      // 新しい光源とヘルパーを追加
      const { light, name, helper } = lights[newIndex]();
      scene.add(light);
      currentLight = light;
      if (helper) {
        scene.add(helper);
        currentHelper = helper;
      } else {
        currentHelper = null;
      }
      setCurrentLightName(name);
    };

    // 視点を切り替える関数
    const changeView = (direction) => {
      if (isOrbitMode) return;
      
      const newIndex = (currentViewRef.current + direction + views.length) % views.length;
      currentViewRef.current = newIndex;
      updateCamera();
    };

    // 距離を変更する関数
    const changeDistance = (delta) => {
      if (isOrbitMode) return;
      
      const newDistance = Math.max(0.1, Math.min(20, currentDistanceRef.current + delta));
      currentDistanceRef.current = newDistance;
      setCurrentDistance(newDistance);
      updateCamera();
    };

    // カメラを更新する関数
    const updateCamera = () => {
      const view = views[currentViewRef.current];
      const position = view.getPosition(currentDistanceRef.current);
      const lookAt = view.getLookAt();
      
      camera.position.copy(position);
      camera.lookAt(lookAt);
      setCurrentViewName(view.name);
    };

    // マウスホイールイベントの処理
    const handleWheel = (event) => {
      event.preventDefault();
      
      if (event.ctrlKey) {
        // Ctrl + ホイールで距離を変更
        const delta = event.deltaY > 0 ? -0.5 : 0.5;
        changeDistance(delta);
      } else {
        // 通常のホイールで光源を切り替え
        const direction = event.deltaY > 0 ? 1 : -1;
        changeLight(direction);
      }
    };

    // キーボードイベントの処理
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          changeView(-1);
          break;
        case 'ArrowRight':
          changeView(1);
          break;
        case 'ArrowUp':
          changeDistance(0.5);
          break;
        case 'ArrowDown':
          changeDistance(-0.5);
          break;
        case 'o':
          setIsOrbitMode(!isOrbitMode);
          controls.enabled = !isOrbitMode;
          if (!isOrbitMode) {
            updateCamera();
          }
          break;
      }
    };

    mountRef.current.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    // 初期光源の設定
    const { light, name, helper } = lights[0]();
    scene.add(light);
    currentLight = light;
    if (helper) {
      scene.add(helper);
      currentHelper = helper;
    }
    setCurrentLightName(name);

    // 初期視点の設定
    updateCamera();

    // アニメーションループ
    const animate = () => {
      requestAnimationFrame(animate);
      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }
      if (currentHelper) {
        currentHelper.update();
      }
      if (controls.enabled) {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // リサイズ処理
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      mountRef.current?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      mountRef.current?.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: 'white',
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '15px 20px',
        borderRadius: '5px',
        maxWidth: '300px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>光源の説明</h3>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>環境光 (AmbientLight)</div>
          <div>シーン全体を均一に照らす光。影を作らない。</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>平行光源 (DirectionalLight)</div>
          <div>太陽光のような平行な光線。方向性があり、影を作る。</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>点光源 (PointLight)</div>
          <div>電球のような全方向に広がる光。距離に応じて減衰する。</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>スポットライト (SpotLight)</div>
          <div>円錐状に広がる光。特定の方向と範囲を照らす。</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>半球光源 (HemisphereLight)</div>
          <div>空と地面からの反射光をシミュレート。自然な環境光を作る。</div>
        </div>
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>操作方法</div>
          <div>Oキー: 自由視点モード切替</div>
          <div>マウスホイール: 光源切替</div>
          <div>Ctrl + ホイール: 距離調整</div>
        </div>
      </div>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '10px 20px',
        borderRadius: '5px'
      }}>
        <div>光源: {currentLightName}</div>
        <div>視点: {currentViewName}</div>
        <div>距離: {currentDistance.toFixed(1)}</div>
        <div>モード: {isOrbitMode ? '自由視点' : '固定視点'}</div>
        <div style={{ fontSize: '16px', marginTop: '10px' }}>
          <div>← → キーで視点を切り替え</div>
          <div>↑ ↓ キーで距離を調整</div>
          <div>Ctrl + ホイールで距離を調整</div>
        </div>
      </div>
    </div>
  );
};

export default ThreeBox;
