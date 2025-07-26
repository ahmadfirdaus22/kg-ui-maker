'use client';

import React, { useState, useRef, useMemo, useEffect, createContext, useContext } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force';
import InspectorPanel from './InspectorPanel';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  difficulty?: number;
  skills?: string[];
  visualization?: string;
  mastery_percentage?: number;
  [key: string]: any;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface InputGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

interface GraphViewerProps {
  initialData: InputGraphData;
}

// Theme context
const ThemeContext = createContext<{ theme: 'light' | 'dark', toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} });

// Helper to build hierarchical tree from flat data
function buildHierarchy(nodes: GraphNode[], edges: GraphEdge[]) {
  // Map nodes by id
  const nodeMap: { [id: string]: GraphNode & { children?: GraphNode[] } } = {};
  nodes.forEach(node => {
    nodeMap[node.id] = { ...node, children: [] };
  });

  // Build parent-child relationships, avoiding duplicate children
  edges.forEach(edge => {
    const source = nodeMap[edge.source];
    const target = nodeMap[edge.target];
    if (!source || !target) return;
    // Only add if not already present
    if (
      (source.type === 'Subject' && target.type === 'Topic') ||
      (source.type === 'Topic' && target.type === 'Concept')
    ) {
      // Prevent duplicate children
      if (!source.children!.some(child => child.id === target.id)) {
        source.children!.push(target);
      }
    }
  });

  // Only return top-level Subjects
  return nodes.filter(n => n.type === 'Subject').map(s => nodeMap[s.id]);
}

const GraphViewer: React.FC<GraphViewerProps> = ({ initialData }) => {
  console.log('✅ GraphViewer component IS rendering!');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingFocusNodeId, setPendingFocusNodeId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'canvas' | 'table'>('canvas');
  const [tableTab, setTableTab] = useState<'Subject' | 'Topic' | 'Concept'>('Subject');
  const [relatedNodes, setRelatedNodes] = useState<GraphNode[]>([]);
  const [lastClickedNode, setLastClickedNode] = useState<GraphNode | null>(null);
  const [suggestions, setSuggestions] = useState<GraphNode[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<GraphNode | null>(null);
  const fgRef = useRef<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<{ [id: string]: boolean }>({});
  const [showLegend, setShowLegend] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const StarRating = ({ rating }: { rating: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', color: '#f5a623', fontSize: '1.2rem' }}>
      {[...Array(5)].map((_, i) => (
        <span key={i}>{i < rating ? '★' : '☆'}</span>
      ))}
    </div>
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 1. This guard clause is essential. If the component isn't mounted,
    //    we exit early and do nothing.
    if (!mounted) {
      return;
    }
  
    // 2. Now that we know mounted is true, fgRef.current will exist.
    if (fgRef.current) {
      console.log('✅ Success! Applying forces to the mounted graph.');
  
      // You can now tune these values to what looks best.
      fgRef.current.d3Force('charge', d3.forceManyBody().strength(-500));
      fgRef.current.d3Force('link').distance(150);
      fgRef.current.d3Force('collide', d3.forceCollide(25));
      
      // Wake up the simulation to apply the new forces
      fgRef.current.d3ReheatSimulation();
    }
    
  // 3. The dependency array MUST listen for changes to `mounted`.
  //    This makes the hook re-run when mounted changes from false to true.
  }, [mounted]);

  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#181a20' : '#fff';
    document.body.style.color = theme === 'dark' ? '#ededed' : '#222';
  }, [theme]);

  // Handle window resize for graph dimensions
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      if (fgRef.current) {
        fgRef.current.width = window.innerWidth;
        fgRef.current.height = window.innerHeight - 64 - 64;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted]);

  // Transform edges to links format
  const graphData: GraphData = {
    nodes: initialData.nodes,
    links: initialData.edges.map((edge: GraphEdge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label
    }))
  };

  // Update suggestions when search term changes
  useEffect(() => {
    if (searchTerm.length > 0) {
      const matches = graphData.nodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, graphData.nodes]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchInputRef.current === document.activeElement) {
        setSearchTerm('');
        setHighlightedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setHighlightedNode(node);

    // If node has coordinates and graph is visible, zoom immediately.
    if (viewType === 'canvas' && fgRef.current && node.x != null && node.y != null) {
      fgRef.current.centerAt(node.x+40, node.y, 400);
      fgRef.current.zoom(4, 400);
    } else {
      // Otherwise, set as pending and let onEngineStop handle it.
      setPendingFocusNodeId(node.id);
      if (viewType === 'canvas' && fgRef.current) {
        fgRef.current.d3ReheatSimulation();
      }
    }
  };

  const handleTableNodeClick = (node: GraphNode) => {
    if (lastClickedNode && lastClickedNode.id === node.id) {
      // Double click detected
      const relatedNodes = graphData.links
        .filter(link => link.source === node.id || link.target === node.id)
        .map(link => {
          const relatedId = link.source === node.id ? link.target : link.source;
          return graphData.nodes.find(n => n.id === relatedId);
        })
        .filter((n): n is GraphNode => n !== undefined);

      setRelatedNodes(relatedNodes);
    } else {
      setLastClickedNode(node);
      setRelatedNodes([]);
    }
    handleNodeClick(node);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    const found = graphData.nodes.find(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (found) {
      handleNodeClick(found);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (node: GraphNode) => {
    setSearchTerm(node.name);
    handleNodeClick(node);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setHighlightedNode(null);
    setShowSuggestions(false);
  };

  // Table data by type
  const tableData = {
    Subject: graphData.nodes.filter(n => n.type === 'Subject'),
    Topic: graphData.nodes.filter(n => n.type === 'Topic'),
    Concept: graphData.nodes.filter(n => n.type === 'Concept'),
  };

  // Build hierarchical data for the tree view
  const treeData = useMemo(() => buildHierarchy(initialData.nodes, initialData.edges), [initialData]);

  // Toggle expand/collapse
  const handleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add zoom to fit function
  const zoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000);
    }
  };

  // Recursive tree row renderer
  const renderTreeRows = (node: GraphNode & { children?: GraphNode[] }, level = 0, rowIndex = 0): React.ReactNode[] => {
    const isExpandable = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    return [
      <tr
        key={node.id}
        style={{
          background: rowIndex % 2 === 0 ? (theme === 'dark' ? '#23272f' : '#f9f9f9') : (theme === 'dark' ? '#181a20' : '#fff'),
          color: theme === 'dark' ? '#ededed' : '#222',
          cursor: isExpandable ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.background = theme === 'dark' ? '#2d3748' : '#e3e8ee'}
        onMouseOut={e => e.currentTarget.style.background = rowIndex % 2 === 0 ? (theme === 'dark' ? '#23272f' : '#f9f9f9') : (theme === 'dark' ? '#181a20' : '#fff')}
      >
        <td
          style={{ border: 'none', padding: '1rem 1.5rem', paddingLeft: `${level * 2}rem`, fontWeight: level === 0 ? 700 : 400, fontSize: '1rem' }}
          onClick={() => isExpandable && handleExpand(node.id)}
        >
          {isExpandable && (
            <span style={{ marginRight: 8, fontWeight: 'bold', color: '#2196f3' }}>{isExpanded ? '▼' : '▶'}</span>
          )}
          {node.name}
        </td>
        <td style={{ border: 'none', padding: '1rem 1.5rem', fontSize: '1rem' }}>{node.description || '—'}</td>
        <td style={{ border: 'none', padding: '1rem 1.5rem', fontSize: '1rem' }}>
          {node.difficulty && node.difficulty > 0 ? (
            <StarRating rating={node.difficulty} />
          ) : (
            '—'
          )}
        </td>
        <td style={{ border: 'none', padding: '1rem 1.5rem' }}>
          <button
            style={{
              padding: '0.3rem 0.8rem',
              borderRadius: 6,
              border: 'none',
              background: '#2196f3',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 1px 4px rgba(33,150,243,0.08)',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#1565c0'}
            onMouseOut={e => e.currentTarget.style.background = '#2196f3'}
            onClick={e => {
              e.stopPropagation();
              setSelectedNode(node);
            }}
          >
            Detail
          </button>
        </td>
      </tr>,
      isExpanded && node.children && node.children.length > 0
        ? node.children.flatMap((child, idx) => renderTreeRows(child, level + 1, idx))
        : null
    ];
  };

  // console.log('Graph nodes:', graphData.nodes);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {!mounted ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          fontSize: '1.5rem',
          color: '#666',
          background: '#f5f5f5'
        }}>
          Loading Knowledge Graph...
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
          {/* Sidebar placeholder (if you want to render a sidebar here, otherwise remove this div) */}
          {/* If your sidebar is rendered elsewhere, remove this and just use children or layout */}
          {/* <aside style={{ width: 240, background: '#fff', zIndex: 2 }}>
            ...sidebar content...
          </aside> */}
          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '2rem', boxSizing: 'border-box' }}>
            {/* Top bar (not fixed) */}
            <div
              style={{
                height: 64,
                minHeight: 64,
                background: theme === 'dark' ? '#23272f' : '#f5f5f5',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                padding: '0 2rem',
                zIndex: 1,
                gap: '1rem',
                boxSizing: 'border-box',
                width: '100%',
                margin: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <button
                  onClick={() => setViewType(viewType === 'canvas' ? 'table' : 'canvas')}
                  style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  disabled={!mounted}
                >
                  {viewType === 'canvas' ? 'Table View' : 'Canvas View'}
                </button>
                {mounted && (
                  <button
                    onClick={toggleTheme}
                    style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: theme === 'dark' ? '#333' : '#eee', color: theme === 'dark' ? '#fff' : '#222', fontWeight: 'bold', cursor: 'pointer' }}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                )}
                <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: 500, marginLeft: '1rem', position: 'relative' }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search node by name... (Ctrl/Cmd + K)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.9rem', minWidth: 0 }}
                    disabled={!mounted}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#1565c0', color: '#fff', fontWeight: 'bold', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}
                    disabled={!mounted}
                  >
                    Search
                  </button>
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '110%',
                      left: 0,
                      right: 0,
                      background: theme === 'dark' ? '#23272f' : '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '0 0 8px 8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      zIndex: 2001,
                      marginTop: '0.25rem',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}>
                      {suggestions.map(node => (
                        <div
                          key={node.id}
                          onClick={() => handleSuggestionClick(node)}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                            backgroundColor: theme === 'dark' ? '#23272f' : '#fff',
                            color: theme === 'dark' ? '#ededed' : '#222',
                            fontWeight: 500,
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = theme === 'dark' ? '#181a20' : '#f5f5f5'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = theme === 'dark' ? '#23272f' : '#fff'}
                        >
                          <div style={{ fontWeight: 'bold' }}>{node.name}</div>
                          <div style={{ fontSize: '0.85rem', color: theme === 'dark' ? '#b9b9b9' : '#666' }}>{node.type}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {viewType === 'canvas' && mounted && (
                  <>
                    <button
                      onClick={zoomToFit}
                      style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Zoom to Fit
                    </button>
                    <button
                      onClick={() => setShowLegend(!showLegend)}
                      style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {showLegend ? 'Hide Legend' : 'Show Legend'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Main content below the top bar */}
            <div style={{ flex: 1, width: '100%', height: 'calc(100% - 64px)', background: theme === 'dark' ? '#181a20' : '#fff', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
              {/* Canvas View */}
              {viewType === 'canvas' && (
                <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', margin: 0, padding: 0 }}>
                  {mounted ? (
                    <ForceGraph2D
                      ref={fgRef}
                      width={mounted && typeof window !== 'undefined' ? window.innerWidth : 800}
                      height={mounted && typeof window !== 'undefined' ? window.innerHeight - 64 - 64 : 600}
                      graphData={graphData}
                      nodeLabel={(node: any) => (node as GraphNode).name}
                      nodeColor={(node: any) => {
                        const n = node as GraphNode;
                        if (n === highlightedNode) return '#ff3d00'; // Brighter orange-red for better visibility
                        if (n.type === 'Subject') return '#ff8a80';
                        if (n.type === 'Topic') return '#b9f6ca';
                        if (n.type === 'Concept') return '#82b1ff';
                        return '#888';
                      }}
                      linkColor={() => '#222'}
                      onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
                      nodeRelSize={6}
                      linkWidth={1}
                      linkDirectionalParticles={2}
                      linkDirectionalParticleSpeed={0.005}
                      cooldownTicks={100}
                      linkCanvasObject={(link, ctx, globalScale) => {
                        const LABEL = link.label || '';
                        // Only show label for PART_OF, RELATES_TO, PREREQUISITE
                        if (!['PART_OF', 'RELATES_TO', 'PREREQUISITE'].includes(LABEL)) return;
                        const start = link.source as { x: number; y: number; id?: string };
                        const end = link.target as { x: number; y: number; id?: string };
                        if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number' || typeof start.y !== 'number' || typeof end.y !== 'number') return;
                        // Only draw label for one direction to avoid duplicates
                        if (start.id && end.id && String(start.id) > String(end.id)) return;
                        // Calculate midpoint
                        const x = (start.x + end.x) / 2;
                        const y = (start.y + end.y) / 2;
                        // Offset label perpendicular to the edge direction
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        let offsetX = 0, offsetY = 0;
                        if (len > 0) {
                          offsetX = -dy / len * 12; // 12px offset
                          offsetY = dx / len * 12;
                        }
                        ctx.save();
                        ctx.font = `${12 / globalScale}px Sans-Serif`;
                        ctx.fillStyle = '#222'; // label color
                        ctx.textAlign = 'center';
                        ctx.fillText(LABEL, x + offsetX, y + offsetY);
                        ctx.restore();
                      }}
                      nodeCanvasObject={(node, ctx, globalScale) => {
                        const n = node as GraphNode;
                        // Draw node
                        ctx.beginPath();
                        ctx.arc(n.x!, n.y!, 6, 0, 2 * Math.PI, false);
                        ctx.fillStyle =
                          n === highlightedNode ? '#ff3d00' :
                          n.type === 'Subject' ? '#ff8a80' :
                          n.type === 'Topic' ? '#b9f6ca' :
                          n.type === 'Concept' ? '#82b1ff' : '#888';
                        ctx.fill();
                        ctx.strokeStyle = n === highlightedNode ? '#ff3d00' : '#222';
                        ctx.lineWidth = n === highlightedNode ? 2 : 1;
                        ctx.stroke();

                        // Add pulsing effect for highlighted node
                        if (n === highlightedNode) {
                          ctx.beginPath();
                          ctx.arc(n.x!, n.y!, 8, 0, 2 * Math.PI, false);
                          ctx.strokeStyle = 'rgba(255, 61, 0, 0.4)'; // Matching highlight color with opacity
                          ctx.lineWidth = 2;
                          ctx.stroke();
                        }

                        // Only draw label if zoomed in enough
                        if (globalScale > 0.5) {
                          const label = n.name;
                          ctx.font = `${12/globalScale}px sans-serif`;
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'top';
                          ctx.fillStyle = theme === 'dark' ? '#fff' : '#222';
                          ctx.fillText(label, n.x!, n.y! + 8);
                        }
                      }}
                      onEngineStop={() => {
                        if (pendingFocusNodeId && fgRef.current) {
                          const nodeToFocus = graphData.nodes.find(n => n.id === pendingFocusNodeId);
                          
                          if (nodeToFocus && nodeToFocus.x != null && nodeToFocus.y != null) {
                            fgRef.current.centerAt(nodeToFocus.x, nodeToFocus.y, 1000);
                            fgRef.current.zoom(4, 1000);
                            setPendingFocusNodeId(null); // Clear after focusing
                          }
                        }
                      }}
                      d3AlphaDecay={0.01}
                      d3VelocityDecay={0.08}
                      enableNodeDrag={true}
                      enableZoomInteraction={true}
                      enablePanInteraction={true}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: '100%', 
                      fontSize: '1.2rem',
                      color: theme === 'dark' ? '#ededed' : '#666'
                    }}>
                      Loading graph...
                    </div>
                  )}
                  {/* Legend with instructions */}
                  {showLegend && mounted && (
                    <div style={{
                      position: 'fixed',
                      top: '90px',
                      right: '32px',
                      background: theme === 'dark' ? 'rgba(24,26,32,0.97)' : 'rgba(255,255,255,0.97)',
                      color: theme === 'dark' ? '#ededed' : '#222',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '10px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                      border: theme === 'dark' ? '1.5px solid #444' : '1.5px solid #ddd',
                      zIndex: 2000,
                      minWidth: 220,
                      maxWidth: 340,
                      fontSize: '1rem',
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: theme === 'dark' ? '#ededed' : '#222' }}>Node Types</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: theme === 'dark' ? '#ededed' : '#222' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff8a80' }} />
                          <span style={{ color: theme === 'dark' ? '#ededed' : '#222', fontWeight: 500 }}>Subject</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#b9f6ca' }} />
                          <span style={{ color: theme === 'dark' ? '#ededed' : '#222', fontWeight: 500 }}>Topic</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#82b1ff' }} />
                          <span style={{ color: theme === 'dark' ? '#ededed' : '#222', fontWeight: 500 }}>Concept</span>
                        </div>
                      </div>
                      <hr style={{ margin: '1rem 0', border: 0, borderTop: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}` }} />
                      <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                        <b>Instructions:</b>
                        <ul style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
                          <li>Click nodes to expand</li>
                          <li>Double-click to focus</li>
                          <li>Drag to move nodes</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {/* InspectorPanel removed: node details panel would go here */}
                </div>
              )}
              {/* Table View */}
              {viewType === 'table' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', height: '100%' }}>
                  {/* Table Card Container */}
                  <div style={{
                    flex: 1,
                    width: '100%',
                    margin: '2rem 0',
                    background: theme === 'dark' ? '#23272f' : '#fff',
                    borderRadius: 12,
                    overflowX: 'auto',
                    padding: '1.5rem 1rem',
                    minWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                  }}>
                    {mounted ? (
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '1rem', background: 'transparent', color: theme === 'dark' ? '#ededed' : '#222', borderRadius: 12, overflow: 'hidden' }}>
                        <thead>
                          <tr style={{ background: theme === 'dark' ? '#181a20' : '#e3e8ee', color: theme === 'dark' ? '#ededed' : '#111' }}>
                            <th style={{ border: 'none', padding: '1rem 1.5rem', fontWeight: 700, fontSize: '1.08rem', textAlign: 'left' }}>Name</th>
                            <th style={{ border: 'none', padding: '1rem 1.5rem', fontWeight: 700, fontSize: '1.08rem', textAlign: 'left' }}>Description</th>
                            <th style={{ border: 'none', padding: '1rem 1.5rem', fontWeight: 700, fontSize: '1.08rem', textAlign: 'left' }}>Difficulty</th>
                            <th style={{ border: 'none', padding: '1rem 1.5rem', fontWeight: 700, fontSize: '1.08rem', textAlign: 'left' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {treeData.flatMap((subject, i) => renderTreeRows(subject, 0, i))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100%', 
                        fontSize: '1.2rem',
                        color: theme === 'dark' ? '#ededed' : '#666'
                      }}>
                        Loading table...
                      </div>
                    )}
                  </div>
                  {/* InspectorPanel removed: node details panel would go here */}
                </div>
              )}
            </div>
          </div>
          {/* Side panel for node details using InspectorPanel */}
          {selectedNode && (
            <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 400, zIndex: 3000, overflowY: 'auto' }}>
              <InspectorPanel
                node={selectedNode}
                allNodes={graphData.nodes}
                onClose={() => setSelectedNode(null)}
                theme={theme}
                sidebarStyle={true}
              />
            </div>
          )}
        </div>
      )}
    </ThemeContext.Provider>
  );
};

export const KnowledgeGraphDashboard: React.FC<{ selectedSubject?: string, showDetails?: boolean }> = ({ selectedSubject = '', showDetails = true }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const fgRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // All useEffect callbacks should return void or a cleanup function, not JSX
  useEffect(() => {
    setMounted(true);
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const nodeTypes = ['Subject', 'Topic', 'Concept'];
        const allNodes: GraphNode[] = [];
        const allEdges: GraphEdge[] = [];
        for (const type of nodeTypes) {
          const response = await fetch(`http://localhost:8000/api/v1/knowledge-graph/nodes-with-mastery/${type}`);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              data.forEach((item: any) => {
                allNodes.push({ ...item, id: item.name, type });
                if (Array.isArray(item.relationships)) {
                  item.relationships.forEach((rel: any) => {
                    allEdges.push({ source: item.name, target: rel.target_node, label: rel.type });
                  });
                }
              });
            }
          }
        }
        setGraphData({ nodes: allNodes, links: allEdges });
      } catch (err) {
        setGraphData({ nodes: [], links: [] });
      }
    };
    fetchData();
  }, []);

  // After nodes/edges change, center the graph
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50); // 400ms animation, 50px padding
    }
  }, [graphData.nodes, graphData.links]);

  const filtered = useMemo(() => {
    if (!selectedSubject) return { nodes: [], links: [] };
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const queue: string[] = [selectedSubject];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        graphData.links.forEach(link => {
          if (link.source === current && !visited.has(link.target)) {
            queue.push(link.target);
          }
        });
      }
    }
    const nodes = graphData.nodes.filter(n => visited.has(n.id));
    const links = graphData.links.filter(l => visited.has(l.source) && visited.has(l.target));
    return { nodes, links };
  }, [selectedSubject, graphData]);

  const getNodeColor = (node: any) => {
    const n = node as GraphNode;
    const mastery = typeof n.mastery_percentage === 'number' ? n.mastery_percentage : 0;
    if (mastery <= 0) return 'rgba(128,128,128,0.5)'; // gray
    const opacity = Math.max(0.2, Math.min(1, mastery / 100));
    return `rgba(67, 160, 71, ${opacity})`; // green with opacity
  };

  useEffect(() => {
    console.log('Attempting to apply new D3 forces...');
    if (fgRef.current) {
      // Increase repulsion between nodes even more
      console.log('Graph reference found! Applying forces now.');
      fgRef.current.d3Force('charge', d3.forceManyBody().strength(-200));
      fgRef.current.d3Force('link').distance(150);
      fgRef.current.d3Force('collide', d3.forceCollide(15));
      fgRef.current.d3ReheatSimulation();
    }
  }, [filtered.nodes, filtered.links]);

  // Ensure the component always returns JSX
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!selectedSubject ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" stroke="#43a047" strokeWidth="2" fill="#e8f5e9" />
            <path d="M8 12h8M12 8v8" stroke="#43a047" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 4 }}>No subject selected</div>
          <div style={{ fontSize: '1rem', color: '#aaa' }}>Please select a subject to view the knowledge graph.</div>
        </div>
      ) : mounted ? (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes: filtered.nodes, links: filtered.links }}
          nodeLabel={(node: any) => (node as GraphNode).name}
          nodeColor={node => getNodeColor(node)}
          linkColor={() => '#222'}
          onNodeClick={showDetails ? (node: any) => setSelectedNode(node as GraphNode) : undefined}
          nodeRelSize={6}
          linkWidth={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          d3VelocityDecay={0.2}
          linkCanvasObject={(link, ctx, globalScale) => {
            const LABEL = link.label || '';
            // Only show label for PART_OF, RELATES_TO, PREREQUISITE
            if (!['PART_OF', 'RELATES_TO', 'PREREQUISITE'].includes(LABEL)) return;
            // Cast source and target to the correct type
            const start = link.source as { x: number; y: number; id?: string };
            const end = link.target as { x: number; y: number; id?: string };
            if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number' || typeof start.y !== 'number' || typeof end.y !== 'number') return;
            // Only draw label for one direction to avoid duplicates
            if (start.id && end.id && String(start.id) > String(end.id)) return;
            // Calculate midpoint
            const x = (start.x + end.x) / 2;
            const y = (start.y + end.y) / 2;
            // Offset label perpendicular to the edge direction
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            let offsetX = 0, offsetY = 0;
            if (len > 0) {
              offsetX = -dy / len * 12; // 12px offset
              offsetY = dx / len * 12;
            }
            ctx.save();
            ctx.font = `${12 / globalScale}px Sans-Serif`;
            ctx.fillStyle = '#222'; // label color
            ctx.textAlign = 'center';
            ctx.fillText(LABEL, x + offsetX, y + offsetY);
            ctx.restore();
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = getNodeColor(n);
            ctx.fill();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.stroke();
            if (globalScale > 0.5) {
              const label = n.name;
              ctx.font = `${12/globalScale}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = '#222';
              ctx.fillText(label, n.x!, n.y! + 8);
            }
          }}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.2rem', color: '#666' }}>
          Loading graph...
        </div>
      )}
      {/* InspectorPanel removed: node details panel would go here */}
    </div>
  );
};

export default GraphViewer; 