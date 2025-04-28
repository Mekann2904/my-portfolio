// src/scripts/animations.ts
import anime from 'animejs'; // アニメーションライブラリ
import * as THREE from 'three'; // 3D グラフィックライブラリ

/* ───────────────────────── Scene-1 : Cube Grid ───────────────────────── */
(() => {
  // Cube Grid のコンテナ要素を取得
  const grid = document.querySelector<HTMLDivElement>('.cube-grid');
  console.log('Scene 1 grid:', grid); // null になっていないか？
  // 要素が見つからなければ処理を中断
  if (!grid) return;
  

  const cubes: HTMLDivElement[] = []; // Cube 要素を格納する配列
  const N = 5; // 各次元の Cube の数 (5x5x5 = 125 個)
  const gap = 54; // Cube 間の間隔 (ピクセル)

  // 3重ループで 5x5x5 の Cube を生成
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const el = document.createElement('div'); // div 要素を作成
        el.className = 'cube'; // CSS クラス 'cube' を設定

        // CSS カスタムプロパティ (--tx, --ty, --tz) を使って各 Cube の初期位置を設定
        // (x - (N - 1) / 2) * gap でグリッドの中心が原点 (0,0,0) になるように調整
        el.style.setProperty('--tx', `${(x - (N - 1) / 2) * gap}px`);
        el.style.setProperty('--ty', `${(y - (N - 1) / 2) * gap}px`);
        el.style.setProperty('--tz', `${(z - (N - 1) / 2) * gap}px`);

        grid.appendChild(el); // コンテナに Cube 要素を追加
        cubes.push(el); // 配列にも追加
      }
    }
  }

  /* アニメーション: まずスケールアップで存在を強調 → その後ループ回転 */
  anime({
    targets: cubes, // 対象は生成した全ての Cube 要素
    scale: [0, 1], // スケールを 0 から 1 へ (出現アニメーション)
    opacity: [0, 1], // 不透明度を 0 から 1 へ (フェードイン)
    easing: 'easeOutBack', // イージング関数 (少しオーバーシュートする感じ)
    duration: 800, // アニメーション時間 (ミリ秒)
    delay: anime.stagger(20), // 各 Cube のアニメーション開始を 20ms ずつ遅延
  }).finished.then(() => {
    // スケールアップアニメーション完了後にループアニメーションを開始
    anime.timeline({ loop: true }) // タイムラインを作成し、ループ再生を設定
      .add({
        targets: cubes,
        rotateX: '+=360', // X軸周りに 360 度回転 (現在の角度から)
        rotateY: '+=360', // Y軸周りに 360 度回転 (現在の角度から)
        easing: 'easeInOutSine', // イージング関数 (滑らかな開始と終了)
        duration: 6000, // アニメーション時間 (6秒)
        delay: anime.stagger(40), // 各 Cube のアニメーション開始を 40ms ずつ遅延
      });
  });
})(); // 即時実行関数でスコープを区切る

/* ──────────────────────── Scene-2 : Particle Burst ──────────────────────── */
(() => {
  // Particle 用の Canvas 要素を取得
  const canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
  if (!canvas) return; // 要素がなければ中断

  // 2D 描画コンテキストを取得
  const ctx = canvas.getContext('2d')!;
  // リサイズ処理: ウィンドウサイズに合わせて Canvas サイズを更新
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize); // ウィンドウリサイズ時に resize 関数を実行
  resize(); // 初期サイズ設定

  const NUM = 600; // パーティクルの数
  const RADIUS = 10; // パーティクルの初期半径

  // パーティクルの状態を表すインターフェース
  interface Particle {
    x: number; // x 座標
    y: number; // y 座標
    dx: number; // x 方向の速度成分
    dy: number; // y 方向の速度成分
    r: number; // 半径
  }

  // パーティクルを生成し、破裂アニメーションを開始する関数
  function spawnBurst() {
    const parts: Particle[] = []; // パーティクル配列
    const cx = canvas.width / 2; // Canvas の中心 x 座標
    const cy = canvas.height / 2; // Canvas の中心 y 座標

    // 指定された数のパーティクルを生成
    for (let i = 0; i < NUM; i++) {
      const ang = (i / NUM) * Math.PI * 2; // 0 から 2π までの角度を均等に割り当て
      parts.push({
        x: cx, // 初期位置は Canvas 中心
        y: cy,
        // 速度成分: 角度に基づいて計算し、ランダムな速さ (2〜5) を加える
        dx: Math.cos(ang) * (Math.random() * 3 + 2),
        dy: Math.sin(ang) * (Math.random() * 3 + 2),
        r: RADIUS, // 初期半径
      });
    }

    // パーティクルをアニメーションさせる
    anime({
      targets: parts, // 対象は生成したパーティクル配列
      // 最終的な位置: 初期位置 + 速度ベクトル * 200 (遠くまで飛ばす)
      x: (p: Particle) => p.x + p.dx * 200,
      y: (p: Particle) => p.y + p.dy * 200,
      r: 0, // 半径を 0 に (消滅アニメーション)
      duration: 4000, // アニメーション時間 (4秒、ゆっくり拡散)
      easing: 'easeOutExpo', // イージング関数 (指数的に減速)
      // 各フレーム更新時の処理
      update: () => {
        // Canvas をクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 全てのパーティクルを描画
        for (const p of parts) {
          ctx.beginPath(); // パスを開始
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); // 円を描画
          // 塗りつぶし色: シアン、不透明度は半径に比例 (徐々に薄くなる)
          ctx.fillStyle = `rgba(0, 255, 255, ${p.r / RADIUS / 2})`;
          ctx.fill(); // 塗りつぶし
        }
      },
      // アニメーション完了時の処理
      complete: spawnBurst, // 再度 spawnBurst を呼び出し、ループさせる
    });
  }

  spawnBurst(); // 最初のパーティクル破裂を開始
})();

/* ────────────────── Scene-3 : Wave Mesh (Three.js) ────────────────── */
(() => {
  // Wave 用の Canvas 要素を取得
  const canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
  if (!canvas) return; // 要素がなければ中断

  // Three.js の WebGL レンダラーを作成
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas, // 描画対象の Canvas
    antialias: true, // アンチエイリアス有効
  });
  // デバイスのピクセル比を設定 (高解像度ディスプレイ対応)
  renderer.setPixelRatio(window.devicePixelRatio);

  // シーンを作成
  const scene = new THREE.Scene();
  // シーンの背景色を黒に設定
  scene.background = new THREE.Color(0x000000);

  // カメラを作成 (PerspectiveCamera: 遠近法)
  // 引数: 視野角, アスペクト比(初期値1), nearクリップ, farクリップ
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  // カメラの初期位置を設定 (x=0, y=30, z=60)
  camera.position.set(0, 30, 60);

  // 光源を作成
  // 平行光源 (DirectionalLight): 白(0xffffff), 強度1
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(0, 50, 50); // 光源の位置
  scene.add(dirLight); // シーンに追加
  // 環境光 (AmbientLight): 全体を均一に照らす, グレー(0x404040)
  scene.add(new THREE.AmbientLight(0x404040));

  // ジオメトリ (形状) を作成: 平面 (PlaneGeometry)
  // 引数: 幅, 高さ, 幅方向の分割数, 高さ方向の分割数
  const geo = new THREE.PlaneGeometry(100, 100, 120, 120);
  // X軸周りに -90 度回転して水平にする
  geo.rotateX(-Math.PI / 2);

  // マテリアル (材質) を作成: PhongMaterial (光沢のある表面)
  const mat = new THREE.MeshPhongMaterial({
    color: 0x00ffff, // 色: シアン
    wireframe: true, // ワイヤーフレーム表示
  });

  // メッシュ (ジオメトリ + マテリアル) を作成し、シーンに追加
  scene.add(new THREE.Mesh(geo, mat));

  // 波アニメーション用の変数
  const wave = { t: 0 }; // 時間パラメータ
  anime({
    targets: wave,
    t: Math.PI * 2, // t を 0 から 2π まで変化させる
    duration: 4000, // アニメーション時間 (4秒)
    easing: 'linear', // イージング: 一定速度
    loop: true, // ループ再生
    // 各フレーム更新時の処理
    update: () => {
      // ジオメトリの頂点位置情報 (position attribute) を取得
      const pos = geo.attributes.position;
      // 全ての頂点をループ処理
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); // 頂点の元の x 座標
        const z = pos.getZ(i); // 頂点の元の z 座標
        // y 座標を sin と cos を使って波のように変化させる
        const y = Math.sin((x + wave.t) * 0.35) * Math.cos((z + wave.t) * 0.35) * 3;
        pos.setY(i, y); // 計算した y 座標をセット
      }
      // 頂点位置が変更されたことを Three.js に伝える
      pos.needsUpdate = true;
    },
  });

  // カメラの周回アニメーション用の変数
  const orbit = { a: 0 }; // 角度パラメータ
  anime({
    targets: orbit,
    a: Math.PI * 2, // a を 0 から 2π まで変化させる
    duration: 12000, // アニメーション時間 (12秒)
    easing: 'linear', // イージング: 一定速度
    loop: true, // ループ再生
    // 各フレーム更新時の処理
    update: () => {
      // カメラの位置を円軌道上で動かす (半径60, 高さ30)
      camera.position.set(
        Math.sin(orbit.a) * 60,
        30,
        Math.cos(orbit.a) * 60
      );
      // カメラの注視点を原点 (0,0,0) に設定
      camera.lookAt(0, 0, 0);
    },
  });

  // リサイズ処理: ウィンドウサイズに合わせてレンダラーとカメラを更新
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーサイズ更新
    camera.aspect = window.innerWidth / window.innerHeight; // カメラのアスペクト比更新
    camera.updateProjectionMatrix(); // カメラの射影行列を更新
  };
  window.addEventListener('resize', resize); // ウィンドウリサイズ時に resize 関数を実行
  resize(); // 初期設定

  // レンダリングループ
  (function render() {
    requestAnimationFrame(render); // 次のフレーム描画を予約
    renderer.render(scene, camera); // シーンとカメラを使って描画
  })();
})();

/* ──────────────────────── Scene-4 : Dot Sphere ──────────────────────── */
(() => {
  // Sphere のコンテナ要素を取得
  const container = document.getElementById('sphereContainer') as HTMLDivElement;
  console.log('Scene 4 container:', container); // null になっていないか？
  if (!container) return; // 要素がなければ中断

  const dots: HTMLDivElement[] = []; // Dot 要素を格納する配列
  const R = 180; // 球体の半径
  const L = 180; // ドットの数

  // Fibonacci lattice (フィボナッチ格子) アルゴリズムで球面上に点を均等に配置
  for (let i = 0; i < L; i++) {
    const phi = Math.acos(-1 + (2 * i) / L); // 緯度方向の角度 (0 から π)
    const theta = Math.sqrt(L * Math.PI) * phi; // 経度方向の角度

    // 球面座標 (r, phi, theta) から直交座標 (x, y, z) へ変換
    const x = R * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.sin(phi) * Math.sin(theta);
    const z = R * Math.cos(phi);

    const d = document.createElement('div'); // div 要素を作成
    d.className = 'dot'; // CSS クラス 'dot' を設定
    // transform: translate3d を使って 3D 空間上に配置
    d.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    container.appendChild(d); // コンテナに Dot 要素を追加
    dots.push(d); // 配列にも追加
  }

  // 球体全体を回転させるアニメーション
  anime({
    targets: container, // 対象はコンテナ要素 (中の Dot も一緒に回転する)
    rotateY: ['0deg', '360deg'], // Y軸周りに 0度 から 360度 へ回転
    rotateX: ['0deg', '-360deg'],// X軸周りに 0度 から -360度 へ回転
    easing: 'linear', // イージング: 一定速度
    duration: 20000, // アニメーション時間 (20秒)
    loop: true, // ループ再生
  });
})();