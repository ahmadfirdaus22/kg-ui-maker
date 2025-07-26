import React, { useState } from 'react';
import { Box, Container, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Tabs, Tab, Paper, Button, TextField, Chip } from '@mui/material';
import SubjectSelector from './components/SubjectSelector';
import GraphViewer from './components/GraphViewer';
import TableView from './components/TableView';
import axios from 'axios';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import { Box as MuiBox } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  skills: string[];
  prerequisite_to?: string[];
  relates_to?: string[];
  part_of?: string[];
}

export interface TopicNode {
  id: string;
  name: string;
  description: string;
  concepts: ConceptNode[];
}

export interface KnowledgeGraphData {
  id: string;
  name: string;
  description: string;
  topics: TopicNode[];
}

function App() {
  const [tab, setTab] = useState(0);
  // View tab state
  const [subject, setSubject] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Build tab state
  const [buildForm, setBuildForm] = useState({ subjectName: '', subjectDescription: '', files: [] as File[] });
  const [buildData, setBuildData] = useState<KnowledgeGraphData | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [editQIdx, setEditQIdx] = useState<number | null>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [questionFeedback, setQuestionFeedback] = useState<{ [idx: number]: 'up' | 'down' | null }>({});
  const [optimizerLoading, setOptimizerLoading] = useState(false);
  const [optimizerError, setOptimizerError] = useState<string | null>(null);
  const [optimizerSuccess, setOptimizerSuccess] = useState<string | null>(null);

  // New state for quick question generation by subject
  const [quickSubject, setQuickSubject] = useState('');
  const [quickQuestions, setQuickQuestions] = useState<any[] | null>(null);
  const [quickQuestionsLoading, setQuickQuestionsLoading] = useState(false);
  const [quickQuestionsError, setQuickQuestionsError] = useState<string | null>(null);

  // View tab logic
  const fetchData = async (subjectName: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(subjectName)}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch knowledge graph');
    } finally {
      setLoading(false);
    }
  };
  const handleSelectSubject = async (subjectName: string) => {
    setSubject(subjectName);
    await fetchData(subjectName);
  };
  const handleRefresh = () => {
    if (subject) fetchData(subject);
  };

  // Build tab logic
  const handleBuildChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBuildForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleBuildFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBuildForm(f => ({ ...f, files: Array.from(e.target.files!) }));
    }
  };
  const handleBuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuildLoading(true);
    setBuildError(null);
    setBuildData(null);
    setQuestions(null);
    try {
      const formData = new FormData();
      formData.append('subject_name', buildForm.subjectName);
      formData.append('subject_description', buildForm.subjectDescription);
      if (buildForm.files && buildForm.files.length > 0) {
        for (const file of buildForm.files) {
          formData.append('syllabus_files', file);
        }
      }
      await axios.post('http://localhost:8000/api/v1/knowledge-graph/build', formData);
      // After build, fetch the new graph
      const res = await axios.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`);
      setBuildData(res.data);
    } catch (err: any) {
      setBuildError(err?.response?.data?.detail || err.message || 'Failed to build knowledge graph');
    } finally {
      setBuildLoading(false);
    }
  };
  const handleBuildRefresh = () => {
    if (buildForm.subjectName) {
      axios.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`)
        .then(res => setBuildData(res.data));
    }
  };
  // Generate questions
  const handleGenerateQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions(null);
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}/generate-questions`);
      let newQuestions = [];
      if (Array.isArray(res.data.questions)) {
        newQuestions = res.data.questions;
      } else if (Array.isArray(res.data)) {
        newQuestions = res.data;
      }
      setQuestions(newQuestions);
      setQuestionFeedback({}); // Reset thumbs
      if (!Array.isArray(res.data.questions) && !Array.isArray(res.data)) {
        setQuestionsError(
          typeof res.data === 'object' && res.data !== null && res.data.error
            ? res.data.error
            : 'Failed to generate questions'
        );
      }
    } catch (err: any) {
      setQuestionsError(err?.response?.data?.detail || err.message || 'Failed to generate questions');
      setQuestions([]);
      setQuestionFeedback({}); // Reset thumbs
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Converts current questions to optimizer dataset format
  const buildOptimizerDataset = () => {
    if (!questions) return [];
    return questions.map((q, idx) => ({
      grade_level: '10',
      learning_preferences: 'balanced',
      concepts: JSON.stringify([{ id: q.concept_id || `c${idx+1}`, name: q.concept_name || q.name || '', description: q.description || '', mastery_level: q.mastery_level || 'in_progress', confidence_score: q.confidence_score || 0.0 }]),
      num_questions: 1,
      next_difficulty: q.difficulty_level || 'easy',
      expected_question: q.problem_statement || q.question || q.text || '',
      expected_difficulty: q.difficulty_level || 'easy',
      expected_rubric: Array.isArray(q.assessment_rubric) ? q.assessment_rubric : [],
      expected_max_point: q.max_point || 1,
      thumbs: { up: questionFeedback[idx] === 'up' ? [idx] : [], down: questionFeedback[idx] === 'down' ? [idx] : [] }
    }));
  };

  // Optimizer handler
  const handleOptimize = async () => {
    setOptimizerLoading(true);
    setOptimizerError(null);
    setOptimizerSuccess(null);
    try {
      const dataset = buildOptimizerDataset();
      await axios.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}/optimize-question-generator`, dataset, {
        headers: { 'Content-Type': 'application/json' }
      });
      setOptimizerSuccess('Optimization complete! Generating new questions...');
      await handleGenerateQuestions();
    } catch (err: any) {
      setOptimizerError(err?.response?.data?.detail || err.message || 'Failed to optimize question generator');
    } finally {
      setOptimizerLoading(false);
    }
  };

  // Edit modal handlers
  const handleEditQOpen = (idx: number) => {
    setEditQIdx(idx);
    const q = questions?.[idx];
    setEditQ(q ? { ...q, assessment_rubric: Array.isArray(q.assessment_rubric) ? q.assessment_rubric : (q.assessment_rubric || '').split(/,| and |;|\n/).map((s: string) => ({ criterion: s.trim(), points: 0 })) } : null);
  };
  const handleEditQChange = (field: string, value: any) => {
    setEditQ((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleEditQRubricChange = (idx: number, value: string) => {
    setEditQ((prev: any) => {
      const rubricPoints = [...(prev.assessment_rubric || [])];
      rubricPoints[idx] = { ...rubricPoints[idx], criterion: value };
      return { ...prev, assessment_rubric: rubricPoints };
    });
  };
  const handleEditQSave = () => {
    if (editQIdx !== null && questions) {
      const updated = [...questions];
      updated[editQIdx] = {
        ...editQ,
        assessment_rubric: editQ.assessment_rubric,
      };
      setQuestions(updated);
      setEditQIdx(null);
      setEditQ(null);
    }
  };
  const handleEditQCancel = () => {
    setEditQIdx(null);
    setEditQ(null);
  };

  const handleThumb = (idx: number, type: 'up' | 'down') => {
    setQuestionFeedback(prev => ({ ...prev, [idx]: prev[idx] === type ? null : type }));
  };

  // Handler for quick question generation
  const handleQuickGenerateQuestions = async () => {
    setQuickQuestionsLoading(true);
    setQuickQuestionsError(null);
    setQuickQuestions(null);
    try {
      const res = await axios.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(quickSubject)}/generate-questions`);
      let newQuestions = [];
      if (Array.isArray(res.data.questions)) {
        newQuestions = res.data.questions;
      } else if (Array.isArray(res.data)) {
        newQuestions = res.data;
      }
      setQuickQuestions(newQuestions);
      setQuestionFeedback({}); // Reset thumbs
      if (!Array.isArray(res.data.questions) && !Array.isArray(res.data)) {
        setQuickQuestionsError(
          typeof res.data === 'object' && res.data !== null && res.data.error
            ? res.data.error
            : 'Failed to generate questions'
        );
      }
    } catch (err: any) {
      setQuickQuestionsError(err?.response?.data?.detail || err.message || 'Failed to generate questions');
      setQuickQuestions([]);
      setQuestionFeedback({}); // Reset thumbs
    } finally {
      setQuickQuestionsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Knowledge Graph Viewer</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="View Knowledge Graph" />
        <Tab label="Build Knowledge Graph" />
        <Tab label="Generate Questions by Subject" />
      </Tabs>
      {tab === 0 && (
        <>
          <SubjectSelector onSelect={handleSelectSubject} />
          {subject && (
            <Box mb={2}>
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, v) => v && setView(v)}
                aria-label="view switcher"
              >
                <ToggleButton value="graph">Graph View</ToggleButton>
                <ToggleButton value="table">Table View</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {subject && !loading && !error && data ? (
            view === 'graph' ? <GraphViewer initialData={convertToGraphViewerData(data)} /> : <TableView data={data} onRefresh={handleRefresh} />
          ) : null}
          {!subject && (
            <Typography variant="body1">Please enter a subject name to view the knowledge graph.</Typography>
          )}
        </>
      )}
      {tab === 1 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <form onSubmit={handleBuildSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Subject Name"
                  name="subjectName"
                  value={buildForm.subjectName}
                  onChange={handleBuildChange}
                  required
                />
                <TextField
                  label="Subject Description"
                  name="subjectDescription"
                  value={buildForm.subjectDescription}
                  onChange={handleBuildChange}
                  required
                  multiline
                  minRows={2}
                />
                <Button variant="outlined" component="label">
                  Upload Syllabus PDF(s)
                  <input type="file" accept="application/pdf" hidden multiple onChange={handleBuildFile} />
                </Button>
                {buildForm.files && buildForm.files.length > 0 && (
                  <Typography variant="body2">Selected: {buildForm.files.map(f => f.name).join(', ')}</Typography>
                )}
                <Button type="submit" variant="contained" disabled={buildLoading}>Build Knowledge Graph</Button>
                {buildLoading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
                {buildError && <Alert severity="error">{typeof buildError === 'string' ? buildError : JSON.stringify(buildError)}</Alert>}
              </Box>
            </form>
          </Paper>
          {buildData && (
            <>
              <Typography variant="h6" gutterBottom>Editable Knowledge Graph</Typography>
              <TableView data={buildData} onRefresh={handleBuildRefresh} />
              <Box mt={3} display="flex" justifyContent="center">
                <Button variant="contained" onClick={handleGenerateQuestions} disabled={questionsLoading}>
                  Generate Questions
                </Button>
              </Box>
              {questionsLoading && <Box display="flex" justifyContent="center" my={2}><CircularProgress /></Box>}
              {questionsError && <Alert severity="error" sx={{ mt: 2 }}>{typeof questionsError === 'string' ? questionsError : JSON.stringify(questionsError)}</Alert>}
              {questions && (
                <Box mt={3}>
                  <Typography variant="h6">Generated Questions with Rubric</Typography>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Question</TableCell>
                          <TableCell>Difficulty</TableCell>
                          <TableCell>Max Point</TableCell>
                          <TableCell>Rubric</TableCell>
                          <TableCell>Feedback</TableCell>
                          <TableCell>Edit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {questions.map((q, i) => {
                          // Rubric points: array of {criterion, points}
                          let rubricPoints: { criterion: string; points: number }[] = [];
                          const rubric = q.assessment_rubric || q.rubric || [];
                          if (Array.isArray(rubric) && rubric.length && typeof rubric[0] === 'object') {
                            rubricPoints = rubric;
                          } else if (Array.isArray(rubric)) {
                            rubricPoints = rubric.map((c: string) => ({ criterion: c, points: 0 }));
                          } else if (typeof rubric === 'string') {
                            rubricPoints = rubric.split(/,| and |;|\n/).map((s: string) => ({ criterion: s.trim(), points: 0 })).filter(r => r.criterion);
                          }
                          // Difficulty color
                          const diff = (q.difficulty_level || '').toLowerCase();
                          let diffColor: 'success' | 'warning' | 'error' | 'secondary' = 'success';
                          if (diff === 'medium') diffColor = 'warning';
                          else if (diff === 'hard') diffColor = 'error';
                          else if (diff === 'expert') diffColor = 'secondary';
                          return (
                            <TableRow key={i}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{q.problem_statement || q.question || q.text || ''}</TableCell>
                              <TableCell><Chip label={diff.charAt(0).toUpperCase() + diff.slice(1)} color={diffColor} size="small" /></TableCell>
                              <TableCell>{q.max_point || ''}</TableCell>
                              <TableCell>
                                <Box display="flex" flexDirection="column" gap={1}>
                                  {rubricPoints.length > 0 ? rubricPoints.map((item, idx) => (
                                    <MuiBox key={idx} sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>{idx + 1}.</Typography>
                                      <Typography variant="body2" sx={{ flex: 1 }}>{item.criterion}</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1976d2', ml: 1 }}>{item.points} pts</Typography>
                                    </MuiBox>
                                  )) : <MuiBox sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1 }}>No rubric provided.</MuiBox>}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <ThumbUpAltOutlinedIcon
                                  fontSize="small"
                                  sx={{ cursor: 'pointer', color: questionFeedback[i] === 'up' ? '#4caf50' : '#aaa' }}
                                  onClick={() => handleThumb(i, 'up')}
                                />
                                <ThumbDownAltOutlinedIcon
                                  fontSize="small"
                                  sx={{ cursor: 'pointer', color: questionFeedback[i] === 'down' ? '#f44336' : '#aaa', ml: 1 }}
                                  onClick={() => handleThumb(i, 'down')}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton size="small" color="primary" onClick={() => handleEditQOpen(i)}>
                                  <EditIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {/* Optimizer Button */}
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button variant="contained" color="secondary" onClick={handleOptimize} disabled={optimizerLoading}>
                      {optimizerLoading ? 'Optimizing...' : 'Optimize Question Generator'}
                    </Button>
                  </Box>
                  {optimizerError && <Alert severity="error" sx={{ mt: 2 }}>{optimizerError}</Alert>}
                  {optimizerSuccess && <Alert severity="success" sx={{ mt: 2 }}>{optimizerSuccess}</Alert>}
                  {/* Edit Question Modal */}
                  <Dialog open={editQIdx !== null} onClose={handleEditQCancel} maxWidth="sm" fullWidth>
                    <DialogTitle>Edit Question</DialogTitle>
                    <DialogContent>
                      {editQ && (
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                          <TextField
                            label="Question"
                            value={editQ.problem_statement || editQ.question || editQ.text || ''}
                            onChange={e => handleEditQChange('problem_statement', e.target.value)}
                            fullWidth
                          />
                          <FormControl fullWidth>
                            <InputLabel>Difficulty</InputLabel>
                            <Select
                              value={editQ.difficulty_level || ''}
                              label="Difficulty"
                              onChange={e => handleEditQChange('difficulty_level', e.target.value)}
                            >
                              <MenuItem value="easy">Easy</MenuItem>
                              <MenuItem value="medium">Medium</MenuItem>
                              <MenuItem value="hard">Hard</MenuItem>
                              <MenuItem value="expert">Expert</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label="Max Point"
                            type="number"
                            value={editQ.max_point || ''}
                            onChange={e => handleEditQChange('max_point', e.target.value)}
                            fullWidth
                          />
                          <Box>
                            <Typography variant="subtitle2">Rubric Points:</Typography>
                            {editQ.assessment_rubric && editQ.assessment_rubric.map((item: any, idx: number) => (
                              <Box key={idx} display="flex" alignItems="center" gap={1} mb={1}>
                                <TextField
                                  label="Criterion"
                                  value={item.criterion}
                                  onChange={e => {
                                    const updated = [...editQ.assessment_rubric];
                                    updated[idx] = { ...updated[idx], criterion: e.target.value };
                                    handleEditQChange('assessment_rubric', updated);
                                  }}
                                  fullWidth
                                  size="small"
                                />
                                <TextField
                                  label="Points"
                                  type="number"
                                  value={item.points}
                                  onChange={e => {
                                    const updated = [...editQ.assessment_rubric];
                                    updated[idx] = { ...updated[idx], points: Number(e.target.value) };
                                    handleEditQChange('assessment_rubric', updated);
                                  }}
                                  size="small"
                                  sx={{ width: 80 }}
                                />
                              </Box>
                            ))}
                            <Button size="small" onClick={() => handleEditQChange('assessment_rubric', [...(editQ.assessment_rubric || []), { criterion: '', points: 0 }])}>Add Point</Button>
                          </Box>
                        </Box>
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleEditQCancel}>Cancel</Button>
                      <Button variant="contained" onClick={handleEditQSave}>Save</Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              )}
            </>
          )}
        </>
      )}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>Generate Questions by Subject</Typography>
          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <TextField
              label="Subject Name"
              value={quickSubject}
              onChange={e => setQuickSubject(e.target.value)}
              size="small"
            />
            <Button variant="contained" onClick={handleQuickGenerateQuestions} disabled={quickQuestionsLoading || !quickSubject}>
              {quickQuestionsLoading ? 'Generating...' : 'Generate Questions'}
            </Button>
          </Box>
          {quickQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof quickQuestionsError === 'string' ? quickQuestionsError : JSON.stringify(quickQuestionsError)}</Alert>}
          {quickQuestions && quickQuestions.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
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
                  {quickQuestions.map((q, i) => {
                    let rubricPoints: { criterion: string; points: number }[] = [];
                    const rubric = q.assessment_rubric || q.rubric || [];
                    if (Array.isArray(rubric) && rubric.length && typeof rubric[0] === 'object') {
                      rubricPoints = rubric;
                    } else if (Array.isArray(rubric)) {
                      rubricPoints = rubric.map((c: string) => ({ criterion: c, points: 0 }));
                    } else if (typeof rubric === 'string') {
                      rubricPoints = rubric.split(/,| and |;|\n/).map((s: string) => ({ criterion: s.trim(), points: 0 })).filter(r => r.criterion);
                    }
                    const diff = (q.difficulty_level || '').toLowerCase();
                    let diffColor: 'success' | 'warning' | 'error' | 'secondary' = 'success';
                    if (diff === 'medium') diffColor = 'warning';
                    else if (diff === 'hard') diffColor = 'error';
                    else if (diff === 'expert') diffColor = 'secondary';
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{q.problem_statement || q.question || q.text || ''}</TableCell>
                        <TableCell><Chip label={diff.charAt(0).toUpperCase() + diff.slice(1)} color={diffColor} size="small" /></TableCell>
                        <TableCell>{q.max_point || ''}</TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {rubricPoints.length > 0 ? rubricPoints.map((item, idx) => (
                              <MuiBox key={idx} sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>{idx + 1}.</Typography>
                                <Typography variant="body2" sx={{ flex: 1 }}>{item.criterion}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1976d2', ml: 1 }}>{item.points} pts</Typography>
                              </MuiBox>
                            )) : <MuiBox sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1 }}>No rubric provided.</MuiBox>}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Container>
  );
}

// Helper to convert KnowledgeGraphData to GraphViewer's InputGraphData
function convertToGraphViewerData(data: any) {
  // If data already has nodes/edges, just return them
  if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return { nodes: data.nodes, edges: data.edges };
  }
  // Otherwise, fallback to old structure
  const nodes = [];
  const edges = [];
  if (data && Array.isArray(data.topics)) {
    nodes.push({ id: data.id, name: data.name, type: 'Subject', description: data.description });
    for (const topic of data.topics) {
      nodes.push({ id: topic.id, name: topic.name, type: 'Topic', description: topic.description });
      edges.push({ source: data.id, target: topic.id, label: 'HAS_TOPIC' });
      for (const concept of topic.concepts) {
        nodes.push({ id: concept.id, name: concept.name, type: 'Concept', description: concept.description });
        edges.push({ source: topic.id, target: concept.id, label: 'HAS_CONCEPT' });
      }
    }
  }
  return { nodes, edges };
}

export default App;
