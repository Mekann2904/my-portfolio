import React, { useEffect, useRef, useState, useCallback } from 'react';
import { select } from 'd3-selection';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { zoom } from 'd3-zoom';
import { drag } from 'd3-drag';

export default function BlogGraph() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildGraph = useCallback(async (nodes, links) => {
    if (!containerRef.current) return;

    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const svg = select(svgRef.current)
      .attr('width', W)
      .attr('height', H)
      .call(
        zoom()
          .scaleExtent([0.3, 3])
          .on('zoom', ({ transform }) => inner.attr('transform', transform))
      );

    const inner = svg.append('g');

    const link = inner.append('g')
      .attr('stroke', '#444')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 0.8);

    const node = inner.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g');

    const currentPath = window.location.pathname;
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

    node.append('circle')
      .attr('r', (d) => {
        if (d.id === (targetNode?.id || currentPath)) return 8;
        return d.ext ? 6 : 4;
      })
      .attr('fill', (d) => (d.ext ? '#ff9b00' : '#fff'))
      .attr('stroke', (d) => d.id === (targetNode?.id || currentPath) ? '#3b82f6' : '#fff')
      .attr('stroke-width', (d) => d.id === (targetNode?.id || currentPath) ? 3 : (d.ext ? 1.5 : 0.8))
      .on('click', (_, d) => {
        if (!d.ext && d.id.startsWith('/blog/')) {
          location.href = d.id;
        }
      });

    node.append('text')
      .text((d) => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
      .attr('x', 8)
      .attr('y', 3)
      .attr('fill', '#fff')
      .attr('font-size', '8px')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px rgba(0,0,0,0.8)');

    const simulation = forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => d.id).distance(80))
      .force('charge', forceManyBody().strength(-300))
      .force('collide', forceCollide().radius((d) => (d.ext ? 6 : 4) + 10))
      .force('center', forceCenter(W / 2, H / 2))
      .alpha(1)
      .alphaDecay(0.05)
      .on('tick', () => {
        link
          .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

    simulationRef.current = simulation;

    if (targetNode) {
      setTimeout(() => {
        targetNode.fx = W / 2;
        targetNode.fy = H / 2;
        simulation.alpha(0.3).restart();
      }, 100);
    }

    node.call(
      drag()
        .on('start', (e, d) => {
          if (!e.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => {
          if (!e.active) simulation.alphaTarget(0);
          d.fx = d.fy = null;
        })
    );
  }, []);

  const reloadGraph = useCallback(async () => {
    simulationRef.current?.stop();
    if (containerRef.current) {
      select(containerRef.current).select('svg').remove();
    }
    if (graphData.nodes.length > 0) {
      buildGraph(graphData.nodes, graphData.links);
    }
  }, [graphData, buildGraph]);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('/blog-graph.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const nodeIds = new Set(data.nodes.map((d) => d.id));
        const filteredLinks = data.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));
        setGraphData({ nodes: data.nodes, links: filteredLinks });
      } catch (e) {
        console.error('Failed to fetch blog graph data:', e);
        setError('グラフデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  useEffect(() => {
    if (!loading && !error && graphData.nodes.length > 0) {
      buildGraph(graphData.nodes, graphData.links);
    }
  }, [loading, error, graphData, buildGraph]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && svgRef.current && simulationRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        select(svgRef.current).attr('width', w).attr('height', h);
        simulationRef.current.force('center', forceCenter(w / 2, h / 2)).alpha(0.3).restart();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="w-full h-full" ref={containerRef}>
      <svg ref={svgRef}></svg>
      <button
        type="button"
        onClick={reloadGraph}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors absolute top-2 right-2"
        aria-label="Reload graph"
        title="Reload graph"
      >
        ↻
      </button>
    </div>
  );
}
