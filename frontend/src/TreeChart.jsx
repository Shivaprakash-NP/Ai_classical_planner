import React, { useMemo, useState, useRef } from 'react';

const NODE_W = 200;
const NODE_H = 80;
const H_GAP = 50;   
const V_GAP = 120;  

function buildTree(treeData) {
  if (!treeData) return null;
  const { root, l1_nodes, l2_nodes } = treeData;

  const rootNode = {
    id: 'root', label: root.label, state: root.state, metrics: root.metrics, type: 'root',
    children: l1_nodes.map((l1) => ({
      id: l1.id, label: l1.label, state: l1.state, edgeLabel: l1.edge, metrics: l1.metrics, type: 'l1',
      children: l2_nodes
        .filter(l2 => l2.parent === l1.id)
        .map(l2 => ({
          id: l2.id, label: l2.label, state: l2.state, edgeLabel: l2.edge, metrics: l2.metrics, type: 'l2',
          children: []
        }))
    }))
  };
  return rootNode;
}

function assignPositions(node, depth = 0, counter = { x: 0 }) {
  if (!node.children || node.children.length === 0) {
    node.x = counter.x * (NODE_W + H_GAP);
    node.y = depth * (NODE_H + V_GAP);
    counter.x++;
  } else {
    node.children.forEach(child => assignPositions(child, depth + 1, counter));
    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    node.x = (firstChild.x + lastChild.x) / 2;
    node.y = depth * (NODE_H + V_GAP);
  }
  return node;
}

function collectAll(node, acc = []) {
  acc.push(node);
  (node.children || []).forEach(c => collectAll(c, acc));
  return acc;
}

const TYPE_COLORS = {
  root:  { fill: 'rgba(99, 102, 241, 0.2)', stroke: '#6366f1', text: '#fff' },
  l1:    { fill: 'rgba(20, 184, 166, 0.2)', stroke: '#14b8a6', text: '#fff' },
  l2:    { fill: 'rgba(236, 72, 153, 0.2)', stroke: '#ec4899', text: '#fff' },
};

export default function TreeChart({ treeData }) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const svgRef = useRef();

  const tree = useMemo(() => {
    if (!treeData) return null;
    const root = buildTree(treeData);
    if (!root) return null;
    const counter = { x: 0 };
    assignPositions(root, 0, counter);
    return root;
  }, [treeData]);

  if (!tree) return <p style={{ color: '#94a3b8', textAlign: 'center' }}>No tree data available.</p>;

  const allNodes = collectAll(tree);
  const minX = Math.min(...allNodes.map(n => n.x)) - NODE_W / 2 - 20;
  const maxX = Math.max(...allNodes.map(n => n.x)) + NODE_W / 2 + 20;
  const minY = Math.min(...allNodes.map(n => n.y)) - 20;
  const maxY = Math.max(...allNodes.map(n => n.y)) + NODE_H + 20;

  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  const edges = [];
  function collectEdges(node) {
    (node.children || []).forEach(child => {
      edges.push({ parent: node, child });
      collectEdges(child);
    });
  }
  collectEdges(tree);

  const handleMouseMove = (e, content) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content
    });
  };

  const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));

  return (
    <div className="tree-container">
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0,0,0,0.6)" />
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const px = e.parent.x;
          const py = e.parent.y + NODE_H;
          const cx = e.child.x;
          const cy = e.child.y;
          const mx = (px + cx) / 2;
          const my = (py + cy) / 2;

          return (
            <g key={`edge-${i}`}>
              <path
                d={`M ${px} ${py} C ${px} ${my}, ${cx} ${my}, ${cx} ${cy}`}
                fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2.5}
              />
              {e.child.edgeLabel && (
                <g 
                  onMouseMove={(ev) => handleMouseMove(ev, `Action: ${e.child.edgeLabel}`)}
                  onMouseLeave={handleMouseLeave}
                  style={{cursor: 'pointer'}}
                >
                  <rect
                    x={mx - 40} y={my - 14} width={80} height={28} rx={14}
                    fill="rgba(15, 17, 26, 0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                  />
                  <text
                    x={mx} y={my + 4} textAnchor="middle" fill="#94a3b8"
                    fontSize={12} fontWeight={600} fontFamily="Inter"
                  >
                    {e.child.edgeLabel || 'None'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {allNodes.map(node => {
          const c = TYPE_COLORS[node.type] || TYPE_COLORS.l2;
          const x = node.x - NODE_W / 2;
          const y = node.y;
          const lines = node.state.split('\n');

          return (
            <g 
              key={node.id}
              onMouseMove={(ev) => handleMouseMove(ev, (
                <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                  <strong style={{color: c.stroke}}>{node.label}</strong>
                  <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0'}}/>
                  <div style={{display:'flex', justifyContent:'space-between', gap:'20px'}}>
                    <span style={{color: '#94a3b8'}}>Cost:</span>
                    <span style={{fontWeight:'bold', color: '#f43f5e'}}>{node.metrics?.cost ?? 0}</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', gap:'20px'}}>
                    <span style={{color: '#94a3b8'}}>Exp. Utility:</span>
                    <span style={{fontWeight:'bold', color: '#10b981'}}>{node.metrics?.eu ?? 0}</span>
                  </div>
                </div>
              ))}
              onMouseLeave={handleMouseLeave}
              style={{cursor: 'pointer'}}
            >
              <rect
                x={x} y={y} width={NODE_W} height={NODE_H} rx={16} ry={16}
                fill={c.fill} stroke={c.stroke} strokeWidth={2} filter="url(#shadow)"
                style={{transition: 'all 0.2s'}}
              />
              <text x={node.x} y={y + 24} textAnchor="middle" fill={c.text} fontSize={14} fontWeight={700} fontFamily="Inter">
                {node.label}
              </text>
              {lines.map((ln, i) => (
                <text key={i} x={node.x} y={y + 44 + i * 18} textAnchor="middle" fill="#cbd5e1" fontSize={13} fontFamily="'Courier New', monospace" fontWeight={600}>
                  {ln}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      
      {/* Tooltip Overlay */}
      <div 
        className={`tree-tooltip ${tooltip.visible ? 'visible' : ''}`}
        style={{ left: tooltip.x + 20, top: tooltip.y + 20 }}
      >
        {tooltip.content}
      </div>
    </div>
  );
}
