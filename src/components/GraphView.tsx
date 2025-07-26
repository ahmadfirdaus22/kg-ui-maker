import React, { useMemo } from 'react';
import { Paper } from '@mui/material';
import ReactFlow, { Background, Controls, Node, Edge } from 'react-flow-renderer';
import { KnowledgeGraphData } from '../App';

interface GraphViewProps {
  data: KnowledgeGraphData;
}

const GraphView: React.FC<GraphViewProps> = ({ data }) => {
  // Generate nodes and edges from the knowledge graph data
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    // Topics as nodes
    for (const topic of data.topics) {
      nodes.push({
        id: topic.id,
        data: { label: topic.name },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        type: 'default',
      });
      // Concepts as nodes, connect to topic
      for (const concept of topic.concepts) {
        nodes.push({
          id: concept.id,
          data: { label: concept.name },
          position: { x: Math.random() * 400, y: Math.random() * 400 },
          type: 'default',
        });
        edges.push({
          id: `${concept.id}-to-${topic.id}`,
          source: concept.id,
          target: topic.id,
          label: 'PART_OF',
        });
      }
    }
    return { nodes, edges };
  }, [data]);

  return (
    <Paper sx={{ p: 2, minHeight: 400 }}>
      <div style={{ width: '100%', height: 500 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </Paper>
  );
};

export default GraphView; 