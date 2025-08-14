import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import api from '../utils/axios';

interface SystemPromptEditorProps {
  open: boolean;
  onClose: () => void;
  currentTab: number;
  tabData: any;
  onDataUpdate: (newData: any) => void;
}

const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  open,
  onClose,
  currentTab,
  tabData,
  onDataUpdate
}) => {
  const [editRequest, setEditRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getTabName = (tabIndex: number): string => {
    const tabNames = [
      'View Knowledge Graph',
      'Build Knowledge Graph', 
      'Generate Questions by Subject',
      'Diagnostic Questions',
      'Concept Lessons',
      'Socratic Questions',
      'My Subjects'
    ];
    return tabNames[tabIndex] || 'Unknown Tab';
  };

  const getDataToEdit = (): any => {
    if (!tabData) return null;

    switch (currentTab) {
      case 0: // View Knowledge Graph
        return tabData;
      case 1: // Build Knowledge Graph
        return tabData;
      case 2: // Generate Questions by Subject
        return tabData;
      case 3: // Diagnostic Questions
        return tabData;
      case 4: // Concept Lessons
        return tabData;
      case 5: // Socratic Questions
        return tabData;
      case 6: // My Subjects
        return tabData;
      default:
        return null;
    }
  };

  const formatDataPreview = (data: any, tabIndex: number): any => {
    if (!data) return null;
    
    switch (tabIndex) {
      case 0: // View Knowledge Graph
        if (data.nodes && data.edges) {
          return {
            type: 'knowledge_graph',
            nodes: data.nodes,
            edges: data.edges
          };
        }
        return null;
        
      case 1: // Build Knowledge Graph
        if (data.nodes && data.edges) {
          return {
            type: 'knowledge_graph',
            nodes: data.nodes,
            edges: data.edges
          };
        }
        return null;
        
      case 2: // Generate Questions by Subject
        if (Array.isArray(data)) {
          return {
            type: 'questions',
            data: data
          };
        }
        return null;
        
      case 3: // Diagnostic Questions
        if (Array.isArray(data)) {
          return {
            type: 'diagnostic_questions',
            data: data
          };
        }
        return null;
        
      case 4: // Concept Lessons
        if (Array.isArray(data)) {
          return {
            type: 'lessons',
            data: data
          };
        }
        return null;
        
      case 5: // Socratic Questions
        if (Array.isArray(data)) {
          return {
            type: 'socratic_questions',
            data: data
          };
        }
        return null;
        
      case 6: // My Subjects
        if (Array.isArray(data)) {
          return {
            type: 'subjects',
            data: data
          };
        }
        return null;
        
      default:
        return null;
    }
  };

  const renderDataPreview = (formattedData: any, tabIndex: number) => {
    if (!formattedData) return null;

    switch (formattedData.type) {
      case 'questions':
        return (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>Max Point</TableCell>
                  <TableCell>Rubric</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(formattedData.data) && formattedData.data.slice(0, 10).map((q: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      {q.problem_statement || q.question || q.text || ''}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={q.difficulty_level || q.difficulty || 'N/A'} 
                        size="small" 
                        color={q.difficulty_level === 'easy' ? 'success' : q.difficulty_level === 'medium' ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{q.max_point || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      {Array.isArray(q.assessment_rubric) ? (
                        <Box>
                          {q.assessment_rubric.map((r: any, idx: number) => (
                            <Box key={idx} sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                              <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
                                {idx + 1}. {r.criterion}
                              </Typography>
                              <Typography variant="body2" component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                                ({r.points} pts)
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'diagnostic_questions':
        return (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>Options</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(formattedData.data) && formattedData.data.slice(0, 10).map((q: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      {q.question_text || q.question || ''}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={q.difficulty || 'N/A'} 
                        size="small" 
                        color={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                      {Array.isArray(q.options) ? q.options.join(', ') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'lessons':
        return (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Concept</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Example Question</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(formattedData.data) && formattedData.data.slice(0, 10).map((l: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{l.concept_name || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                      {l.title || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      {l.example_question || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'socratic_questions':
        return (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Concept</TableCell>
                  <TableCell>Socratic Question</TableCell>
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(formattedData.data) && formattedData.data.slice(0, 10).map((q: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{q.concept_name || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      {q.socratic_question || ''}
                    </TableCell>
                    <TableCell>
                      <Chip label={q.question_type || 'N/A'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'subjects':
        return (
          <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Subject Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Topics</TableCell>
                  <TableCell>Concepts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(formattedData.data) && formattedData.data.slice(0, 10).map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{s.name || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                      {s.description || 'N/A'}
                    </TableCell>
                    <TableCell>{s.topic_total || 0}</TableCell>
                    <TableCell>{s.concept_total || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'knowledge_graph':
        return (
          <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Knowledge Graph Summary
            </Typography>
            <Typography variant="body2">
              Nodes: {formattedData.nodes.length} | Edges: {formattedData.edges.length}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Subject: {formattedData.nodes.find((n: any) => n.type === 'Subject')?.name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Topics: {formattedData.nodes.filter((n: any) => n.type === 'Topic').length}
            </Typography>
            <Typography variant="body2">
              Concepts: {formattedData.nodes.filter((n: any) => n.type === 'Concept').length}
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  const handleApplyEdit = async () => {
    if (!editRequest.trim()) {
      setError('Please enter an edit request');
      return;
    }

    const dataToEdit = getDataToEdit();
    if (!dataToEdit) {
      setError('No data available to edit in this tab');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/knowledge-graph/predict-generic-edit', {
        original_content: JSON.stringify(dataToEdit),
        edit_request: editRequest
      });

      if (response.data.revised_content) {
        let revisedData;
        try {
          revisedData = JSON.parse(response.data.revised_content);
        } catch (parseError) {
          // If parsing fails, use the raw string
          revisedData = response.data.revised_content;
        }

        // Check if changes were applied to the knowledge graph
        const changesApplied = response.data.changes_applied;
        const message = response.data.message;
        const warning = response.data.warning;

        // Show appropriate success/warning message
        if (changesApplied) {
          setSuccess(`Edit applied successfully! ${message || ''}`);
        } else if (warning) {
          setSuccess(`Edit applied with warning: ${warning}`);
        } else {
          setSuccess('Edit applied successfully!');
        }

        onDataUpdate(revisedData);
        setEditRequest('');
        
        // Close dialog after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } else {
        setError('Failed to apply edit: No revised content received');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to apply edit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditRequest('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  const dataToEdit = getDataToEdit();
  const hasData = dataToEdit && Object.keys(dataToEdit).length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        System Prompt Editor - {getTabName(currentTab)}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Apply edits to the current tab's data using natural language instructions.
          </Typography>
          
          {!hasData && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No data available to edit in this tab. Please load some data first.
            </Alert>
          )}

          {hasData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Data Preview:
              </Typography>
              {renderDataPreview(formatDataPreview(dataToEdit, currentTab), currentTab)}
            </Box>
          )}
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Edit Request"
          placeholder="Enter your edit instructions here... (e.g., 'Change all difficulty levels from easy to medium', 'Add a new field called priority to all items')"
          value={editRequest}
          onChange={(e) => setEditRequest(e.target.value)}
          disabled={!hasData || loading}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label="Example: Change all difficulty levels to 'medium'" 
            size="small" 
            onClick={() => setEditRequest("Change all difficulty levels to 'medium'")}
            variant="outlined"
          />
          <Chip 
            label="Example: Add priority field to all items" 
            size="small" 
            onClick={() => setEditRequest("Add a priority field with value 'high' to all items")}
            variant="outlined"
          />
          <Chip 
            label="Example: Update question text" 
            size="small" 
            onClick={() => setEditRequest("Update all question text to be more clear and concise")}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleApplyEdit} 
          variant="contained" 
          disabled={!hasData || !editRequest.trim() || loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Apply Edit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemPromptEditor; 