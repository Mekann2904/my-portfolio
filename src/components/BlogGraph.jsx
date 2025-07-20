import React, { useEffect, useRef, useState, useCallback } from 'react';
import { select } from 'd3-selection';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import { zoom } from 'd3-zoom';
import { drag } from 'd3-drag';

// --- 補助関数 ---

/** SVGと描画領域を初期化 */
function initializeSvg(svgRef, containerRef) {
  const W = containerRef.current.clientWidth;
  const H = containerRef.current.clientHeight;
  const svg = select(svgRef.current).attr('width', W).attr('height', H);
  svg.selectAll('*').remove();
  const inner = svg.append('g');
  return { svg, inner, W, H };
}

/** ノードとリンクを描画 */
function renderElements(inner, nodes, links, targetNodeId) {
  const link = inner
    .append('g')
    .attr('stroke', '#444')
    .attr('stroke-opacity', 0.4)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', 0.8);

  const nodeGroup = inner
    .append('g')
    .selectAll('g')
    .data(nodes)
    .join('g');

  nodeGroup
    .append('circle')
    .attr('r', (d) => (d.id === targetNodeId ? 8 : d.ext ? 6 : 4))
    .attr('fill', (d) => (d.ext ? '#ff9b00' : '#fff'))
    .attr('stroke', (d) => (d.id === targetNodeId ? '#3b82f6' : '#fff'))
    .attr('stroke-width', (d) => (d.id === targetNodeId ? 3 : d.ext ? 1.5 : 0.8))
    .style('cursor', (d) => (!d.ext && d.id.startsWith('/blog/') ? 'pointer' : 'default'))
    .on('click', (_, d) => {
      if (!d.ext && d.id.startsWith('/blog/')) {
        window.location.href = d.id;
      }
    });

  nodeGroup
    .append('text')
    .text((d) => (d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label))
    .attr('x', 8)
    .attr('y', 3)
    .attr('fill', '#fff')
    .attr('font-size', '8px')
    .style('pointer-events', 'none')
    .style('text-shadow', '0 0 3px rgba(0,0,0,0.8)');

  return { link, nodeGroup };
}

/** 物理シミュレーションを生成 */
function createSimulation(nodes, links, W, H, targetNodeId) {
  return forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance(60).strength(0.3))
    .force('charge', forceManyBody().strength(-200))
    .force('collide', forceCollide().radius((d) => (d.id === targetNodeId ? 8 : d.ext ? 6 : 4) + 15))
    .force('forceX', forceX(W / 2).strength((d) => (d.id === targetNodeId ? 0.2 : 0.1)))
    .force('forceY', forceY(H / 2).strength((d) => (d.id === targetNodeId ? 0.2 : 0.1)))
    .alpha(0.8)
    .alphaDecay(0.02);
}

/** ZoomやDragなどの操作を適用 */
function applyInteractivity(svg, inner, nodeGroup, simulation) {
  svg.call(
    zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', ({ transform }) => inner.attr('transform', transform))
  );

  nodeGroup.call(
    drag()
      .on('start', (e, d) => {
        if (!e.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => {
        if (!e.active) simulation.alphaTarget(0);
        if (!e.sourceEvent.shiftKey) { // Shiftキーを押しながらでなければ固定解除
          d.fx = null; d.fy = null;
        }
      })
  );
}

/** 現在のページのノードIDを特定 */
function findTargetNodeId(nodes, currentPath) {
    let targetNode = nodes.find((d) => d.id === currentPath);
    if (!targetNode) {
      const pathWithoutSlash = currentPath.replace(/\/$/, '');
      targetNode = nodes.find((d) => d.id === pathWithoutSlash);
    }
    if (!targetNode) {
      const pathWithBlog = currentPath.startsWith('/blog/') ? currentPath : `/blog${currentPath}`;
      targetNode = nodes.find((d) => d.id === pathWithBlog);
    }
    if (!targetNode) {
      targetNode = nodes.find((d) => d.id.includes(currentPath.replace(/^\//, '')));
    }
    return targetNode ? targetNode.id : null;
}

/** 指定ホップ数でグラフデータをフィルタリング */
function filterGraphByHops(fullData, startNodeId, hops) {
  if (!startNodeId || !fullData.nodes.length) {
    return { nodes: [], links: [] };
  }
  const nodesInHops = new Set([startNodeId]);
  const queue = [{ id: startNodeId, distance: 0 }];
  const adj = new Map();
  fullData.links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    if (!adj.has(sourceId)) adj.set(sourceId, []);
    if (!adj.has(targetId)) adj.set(targetId, []);
    adj.get(sourceId).push(targetId);
    adj.get(targetId).push(sourceId);
  });
  let head = 0;
  while(head < queue.length) {
    const current = queue[head++];
    if (current.distance >= hops) continue;
    const neighbors = adj.get(current.id) || [];
    for (const neighborId of neighbors) {
      if (!nodesInHops.has(neighborId)) {
        nodesInHops.add(neighborId);
        queue.push({ id: neighborId, distance: current.distance + 1 });
      }
    }
  }
  const filteredNodes = fullData.nodes.filter(n => nodesInHops.has(n.id));
  const filteredLinks = fullData.links.filter(l => {
    const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
    const targetId = typeof l.target === 'string' ? l.target : l.target.id;
    return nodesInHops.has(sourceId) && nodesInHops.has(targetId);
  });
  return { nodes: filteredNodes, links: filteredLinks };
}


// --- メインコンポーネント ---
export default function BlogGraph() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  
  const [fullData, setFullData] = useState({ nodes: [], links: [] });
  const [displayData, setDisplayData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hopCount, setHopCount] = useState(2);

  const buildGraph = useCallback((nodes, links) => {
    if (!containerRef.current || !svgRef.current) return;
    
    // 以前のシミュレーションがあれば停止する
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const { svg, inner, W, H } = initializeSvg(svgRef, containerRef);
    const targetNodeId = findTargetNodeId(nodes, window.location.pathname);

    // ノードの初期位置を画面内に適切に配置
    nodes.forEach(node => {
      // 座標がなければ画面内のランダムな位置に配置
      if (node.x === undefined) { 
        node.x = W * 0.1 + Math.random() * W * 0.8; // 画面幅の10%-90%の範囲
      }
      if (node.y === undefined) { 
        node.y = H * 0.1 + Math.random() * H * 0.8; // 画面高さの10%-90%の範囲
      }
    });
    
    const { link, nodeGroup } = renderElements(inner, nodes, links, targetNodeId);
    const simulation = createSimulation(nodes, links, W, H, targetNodeId);
    simulationRef.current = simulation;

    applyInteractivity(svg, inner, nodeGroup, simulation);
    
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
  }, []);

  // 1. 全データを一度だけ取得
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('/blog-graph.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const nodeIds = new Set(data.nodes.map((d) => d.id));
        const filteredLinks = data.links.filter((l) => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });
        setFullData({ nodes: data.nodes, links: filteredLinks });
      } catch (e) {
        console.error('Failed to fetch blog graph data:', e);
        setError('グラフデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchGraphData();
  }, []);
  
  // 2. 全データかホップ数が変更されたら、フィルタリングして表示用データを更新
  useEffect(() => {
    if (fullData.nodes.length > 0) {
      const targetNodeId = findTargetNodeId(fullData.nodes, window.location.pathname);
      const filteredData = filterGraphByHops(fullData, targetNodeId, hopCount);
      setDisplayData(filteredData);
    }
  }, [fullData, hopCount]);

  // 3. 表示用データが更新されたら、コンテナサイズが利用可能になるのを待ってグラフを描画
  useEffect(() => {
    if (loading || error || displayData.nodes.length === 0 || !containerRef.current) {
      return;
    }

    const checkSizeAndBuild = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          buildGraph(displayData.nodes, displayData.links);
          return; // 描画が成功したらポーリングを停止
        }
      }
      // コンテナのサイズがまだ利用できない場合は、少し待ってから再試行
      requestAnimationFrame(checkSizeAndBuild);
    };

    // ポーリングを開始
    const frameId = requestAnimationFrame(checkSizeAndBuild);

    // クリーンアップ関数
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [loading, error, displayData, buildGraph]);
  
  // 4. ウィンドウリサイズ時の処理
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !svgRef.current || !simulationRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      select(svgRef.current).attr('width', w).attr('height', h);
      const sim = simulationRef.current;
      sim.force('forceX').x(w / 2);
      sim.force('forceY').y(h / 2);
      sim.alpha(0.3).restart();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-xs">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs">Graph not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <svg ref={svgRef}></svg>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (displayData.nodes.length > 0) {
              // ▼▼▼ 修正点 2 ▼▼▼
              // D3によって変更されたデータを再利用せず、クリーンなデータで再生成する
              const nodesToRedraw = displayData.nodes.map(n => ({
                id: n.id,
                label: n.label,
                ext: n.ext,
                // x, y, vx, vyなどのD3が追加したプロパティは意図的に含めない
              }));

              const linksToRedraw = displayData.links.map(l => ({
                // D3はsource/targetをオブジェクトに変換するため、IDに戻す
                source: typeof l.source === 'string' ? l.source : l.source.id,
                target: typeof l.target === 'string' ? l.target : l.target.id,
              }));
              
              // リロード時は初期位置をリセット
              nodesToRedraw.forEach(node => {
                node.x = undefined;
                node.y = undefined;
              });
              
              buildGraph(nodesToRedraw, linksToRedraw);
            }
          }}
          className="text-lg text-gray-400 hover:text-white transition-colors bg-black/30 rounded-full w-7 h-7 flex items-center justify-center"
          aria-label="Reload graph"
          title="Reload graph"
        >
          ↻
        </button>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/30 p-1 rounded-full">
        <span className="text-xs text-gray-400 pl-2">Hops:</span>
        {[1, 2, 3].map(h => (
          <button
            key={h}
            onClick={() => setHopCount(h)}
            className={`w-6 h-6 rounded-full text-xs font-medium transition ${hopCount === h ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}