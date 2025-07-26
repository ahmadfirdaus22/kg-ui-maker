import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { KnowledgeGraphData } from '../App';
import RelationEditModal from './RelationEditModal';
import NodeEditModal from './NodeEditModal';
import axios from 'axios';

interface TableViewProps {
  data: KnowledgeGraphData;
  onRefresh?: () => void;
}

const getTopicKey = (topic: any) => topic.id || topic.name;

type EditModalState = {
  open: boolean;
  node: any;
  nodeType: 'Concept' | 'Topic';
  tab: number;
};

const TableView: React.FC<TableViewProps> = ({ data, onRefresh }) => {
  const [editModal, setEditModal] = useState<EditModalState>({ open: false, node: null, nodeType: 'Concept', tab: 0 });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [expanded, setExpanded] = useState<{ [topicKey: string]: boolean }>({});

  // Defensive: If data.topics is undefined, try to reconstruct topics/concepts from nodes
  let topics: any[] = [];
  if (data && Array.isArray((data as any).nodes)) {
    // Group nodes by type
    const nodes = (data as any).nodes;
    // Deduplicate topics by id
    const topicNodesMap = new Map();
    nodes.filter((n: any) => n.type === 'Topic').forEach((t: any) => topicNodesMap.set(t.id, t));
    const topicNodes = Array.from(topicNodesMap.values());
    // Deduplicate concepts by id
    const conceptNodesMap = new Map();
    nodes.filter((n: any) => n.type === 'Concept').forEach((c: any) => conceptNodesMap.set(c.id, c));
    const conceptNodes = Array.from(conceptNodesMap.values());
    // For each topic, find its unique concepts by edges
    const edges = Array.isArray((data as any).edges) ? (data as any).edges : [];
    topics = topicNodes.map((topic: any) => {
      const conceptIds = Array.from(new Set(
        edges.filter((e: any) => e.source === topic.id && e.label === 'HAS_CONCEPT').map((e: any) => e.target)
      ));
      const concepts = conceptNodes.filter((c: any) => conceptIds.includes(c.id));
      return { ...topic, concepts };
    });
  }
  // Defensive: fallback to empty array
  topics = Array.isArray(topics) ? topics : [];

  useEffect(() => {
    setExpanded(prev => {
      const newState: { [topicKey: string]: boolean } = {};
      topics.forEach(t => {
        const key = getTopicKey(t);
        newState[key] = prev[key] !== undefined ? prev[key] : true;
      });
      return newState;
    });
  }, [topics]);

  const subjectName = data.name || '';

  const handleEdit = (node: any, nodeType: 'Concept' | 'Topic') => {
    setEditModal({ open: true, node: { ...node, type: nodeType }, nodeType, tab: 0 });
  };
  const handleClose = () => {
    setEditModal({ open: false, node: null, nodeType: 'Concept', tab: 0 });
  };

  const handleSaveAttribute = async (attrs: { name: string; description: string; skills?: string[] }) => {
    if (!editModal.node) return;
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:8000/api/v1/knowledge-graph/nodes/${editModal.node.type}/${encodeURIComponent(editModal.node.name)}`,
        attrs
      );
      setSnackbar({ open: true, message: 'Node updated successfully', severity: 'success' });
      handleClose();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Failed to update node', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRelation = async (relations: { prerequisite_to: string[]; relates_to: string[]; part_of: string[] }) => {
    if (!editModal.node) return;
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:8000/api/v1/knowledge-graph/nodes/${editModal.node.type}/${encodeURIComponent(editModal.node.name)}/relations`,
        relations
      );
      setSnackbar({ open: true, message: 'Relations updated successfully', severity: 'success' });
      handleClose();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Failed to update relations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (topic: any) => {
    const key = getTopicKey(topic);
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Prerequisite To</TableCell>
            <TableCell>Relates To</TableCell>
            <TableCell>Part Of</TableCell>
            <TableCell>Edit</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {topics.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body2">No nodes found for this subject.</Typography>
              </TableCell>
            </TableRow>
          )}
          {topics.map((topic) => {
            const topicKey = getTopicKey(topic);
            return (
              <React.Fragment key={topicKey}>
                <TableRow sx={{ background: '#f5f6fa' }}>
                  <TableCell colSpan={7}>
                    <Box display="flex" alignItems="center">
                      <IconButton size="small" onClick={() => toggleExpand(topic)}>
                        {expanded[topicKey] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </IconButton>
                      <Typography fontWeight="bold">{topic.name}</Typography>
                      <Typography variant="caption" sx={{ ml: 2, color: 'gray' }}>Topic</Typography>
                      <IconButton size="small" color="primary" sx={{ ml: 1 }} onClick={() => handleEdit(topic, 'Topic')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{topic.description}</Typography>
                  </TableCell>
                </TableRow>
                {expanded[topicKey] && topic.concepts && topic.concepts.map((concept: any) => (
                  <TableRow key={concept.id || concept.name} sx={{ background: '#fafbfc' }}>
                    <TableCell sx={{ pl: 6 }}>{concept.name}</TableCell>
                    <TableCell>Concept</TableCell>
                    <TableCell>{concept.description}</TableCell>
                    <TableCell>{(concept.prerequisite_to || []).join(', ')}</TableCell>
                    <TableCell>{(concept.relates_to || []).join(', ')}</TableCell>
                    <TableCell>{(concept.part_of || [topic.name]).join(', ')}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => handleEdit(concept, 'Concept')}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      {/* Combined Edit Modal with Tabs */}
      {editModal.open && (
        <Dialog open={editModal.open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>Edit {editModal.nodeType}</DialogTitle>
          <Tabs value={editModal.tab} onChange={(_, v) => setEditModal(s => ({ ...s, tab: v }))}>
            <Tab label="Attributes" />
            <Tab label="Relations" />
          </Tabs>
          <DialogContent>
            {editModal.tab === 0 ? (
              <NodeEditModal
                open={true}
                onClose={handleClose}
                onSave={async (attrs) => {
                  await handleSaveAttribute(attrs);
                  handleClose();
                }}
                initialData={editModal.node || { name: '', description: '', skills: [] }}
                showSkills={editModal.nodeType === 'Concept'}
              />
            ) : (
              <RelationEditModal
                open={true}
                onClose={handleClose}
                onSave={async (relations) => {
                  await handleSaveRelation(relations);
                  handleClose();
                }}
                initialData={editModal.node || { prerequisite_to: [], relates_to: [], part_of: [] }}
                subjectName={subjectName}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {loading && <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%' }} />}
    </TableContainer>
  );
};

export default TableView; 