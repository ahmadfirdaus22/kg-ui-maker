import React, { useState } from 'react';
import { Box, Container, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Tabs, Tab, Paper, Button, TextField, Chip } from '@mui/material';
import SubjectSelector from './components/SubjectSelector';
import GraphViewer from './components/GraphViewer';
import TableView from './components/TableView';
import Header from './components/Header';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api from './utils/axios';
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

function AppContent() {
  const { isAuthenticated, login, authLoading } = useAuth();
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

  // Diagnostic Questions state
  const [diagnosticSubject, setDiagnosticSubject] = useState('');
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[] | null>(null);
  const [diagnosticQuestionsLoading, setDiagnosticQuestionsLoading] = useState(false);
  const [diagnosticQuestionsError, setDiagnosticQuestionsError] = useState<string | null>(null);

  // Concept Lessons state
  const [lessonsSubject, setLessonsSubject] = useState('');
  const [lessons, setLessons] = useState<any[] | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [lessonsForm, setLessonsForm] = useState({
    grade: '10',
    mastery_level: 'beginner',
    num_lessons: 3
  });

  // Socratic Questions state
  const [socraticSubject, setSocraticSubject] = useState('');
  const [socraticQuestions, setSocraticQuestions] = useState<any[] | null>(null);
  const [socraticQuestionsLoading, setSocraticQuestionsLoading] = useState(false);
  const [socraticQuestionsError, setSocraticQuestionsError] = useState<string | null>(null);
  const [socraticForm, setSocraticForm] = useState({
    question_type: 'open_ended',
    num_questions: 5
  });

  // Socratic Questions from Practice Questions state
  const [socraticFromPractice, setSocraticFromPractice] = useState<{ [lessonIndex: number]: any[] }>({});
  const [socraticFromPracticeLoading, setSocraticFromPracticeLoading] = useState<{ [lessonIndex: number]: boolean }>({});
  const [socraticFromPracticeError, setSocraticFromPracticeError] = useState<string | null>(null);

  // My Subjects state
  const [mySubjects, setMySubjects] = useState<any[] | null>(null);
  const [mySubjectsLoading, setMySubjectsLoading] = useState(false);
  const [mySubjectsError, setMySubjectsError] = useState<string | null>(null);

  // Hint and Scaffold state
  const [hintData, setHintData] = useState<{ [key: number]: any }>({});
  const [scaffoldData, setScaffoldData] = useState<{ [key: number]: any }>({});
  const [hintLoading, setHintLoading] = useState<{ [key: number]: boolean }>({});
  const [scaffoldLoading, setScaffoldLoading] = useState<{ [key: number]: boolean }>({});

  // View tab logic
  const fetchData = async (subjectName: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(`/knowledge-graph/subject/${encodeURIComponent(subjectName)}`);
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
      
      // Debug: Log what we're sending
      console.log('Form data being sent:', {
        subject_name: buildForm.subjectName,
        subject_description: buildForm.subjectDescription,
        files_count: buildForm.files?.length || 0
      });
      
      await api.post('http://localhost:8000/api/v1/knowledge-graph/build', formData);
      // After build, fetch the new graph
      const res = await api.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`);
      setBuildData(res.data);
    } catch (err: any) {
      console.error('Build error:', err);
      setBuildError(err?.response?.data?.detail || err.message || 'Failed to build knowledge graph');
    } finally {
      setBuildLoading(false);
    }
  };
  const handleBuildRefresh = () => {
    if (buildForm.subjectName) {
      api.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`)
        .then(res => setBuildData(res.data));
    }
  };
  // Generate questions
  const handleGenerateQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions(null);
    try {
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}/generate-questions`);
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
      await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}/optimize-question-generator`, dataset, {
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
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(quickSubject)}/generate-questions`);
      let newQuestions = [];
      if (Array.isArray(res.data.questions)) {
        newQuestions = res.data.questions;
      } else if (res.data.questions && typeof res.data.questions === 'string') {
        try {
          newQuestions = JSON.parse(res.data.questions);
        } catch (e) {
          newQuestions = [{ problem_statement: res.data.questions }];
        }
      }
      setQuickQuestions(newQuestions);
    } catch (err: any) {
      setQuickQuestionsError(err?.response?.data?.detail || err.message || 'Failed to generate questions');
    } finally {
      setQuickQuestionsLoading(false);
    }
  };

  // Diagnostic Questions handlers
  const handleGenerateDiagnosticQuestions = async () => {
    setDiagnosticQuestionsLoading(true);
    setDiagnosticQuestionsError(null);
    setDiagnosticQuestions(null);
    
    try {
      // Single API call - backend now handles all difficulty levels automatically
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(diagnosticSubject)}/generate-diagnostic-questions`);
      
      let questions = [];
      if (Array.isArray(res.data.diagnostic_questions)) {
        questions = res.data.diagnostic_questions;
      } else if (res.data.diagnostic_questions && typeof res.data.diagnostic_questions === 'string') {
        try {
          questions = JSON.parse(res.data.diagnostic_questions);
        } catch (e) {
          questions = [{ diagnostic_question: res.data.diagnostic_questions }];
        }
      }
      
      setDiagnosticQuestions(questions);
    } catch (err: any) {
      setDiagnosticQuestionsError(err?.response?.data?.detail || err.message || 'Failed to generate diagnostic questions');
    } finally {
      setDiagnosticQuestionsLoading(false);
    }
  };

  // Concept Lessons handlers
  const handleLessonsFormChange = (field: string, value: any) => {
    setLessonsForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateLessons = async () => {
    setLessonsLoading(true);
    setLessonsError(null);
    setLessons(null);
    try {
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(lessonsSubject)}/generate-concept-lessons`);
      let newLessons = [];
      if (Array.isArray(res.data.lessons)) {
        newLessons = res.data.lessons;
      } else if (res.data.lessons && typeof res.data.lessons === 'string') {
        try {
          newLessons = JSON.parse(res.data.lessons);
        } catch (e) {
          newLessons = [{ lesson_content: res.data.lessons }];
        }
      }
      setLessons(newLessons);
    } catch (err: any) {
      setLessonsError(err?.response?.data?.detail || err.message || 'Failed to generate lessons');
    } finally {
      setLessonsLoading(false);
    }
  };

  // Socratic Questions handlers
  const handleSocraticFormChange = (field: string, value: any) => {
    setSocraticForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateSocraticQuestions = async () => {
    setSocraticQuestionsLoading(true);
    setSocraticQuestionsError(null);
    setSocraticQuestions(null);
    try {
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(socraticSubject)}/generate-socratic-questions`, socraticForm);
      let newQuestions = [];
      if (Array.isArray(res.data.socratic_questions)) {
        newQuestions = res.data.socratic_questions;
      } else if (res.data.socratic_questions && typeof res.data.socratic_questions === 'string') {
        try {
          newQuestions = JSON.parse(res.data.socratic_questions);
        } catch (e) {
          newQuestions = [{ socratic_question: res.data.socratic_questions }];
        }
      }
      setSocraticQuestions(newQuestions);
    } catch (err: any) {
      setSocraticQuestionsError(err?.response?.data?.detail || err.message || 'Failed to generate socratic questions');
    } finally {
      setSocraticQuestionsLoading(false);
    }
  };

  const handleGenerateSocraticFromPractice = async (practiceContent: string, conceptName: string, lessonIndex: number) => {
    setSocraticFromPracticeLoading(prev => ({ ...prev, [lessonIndex]: true }));
    setSocraticFromPracticeError(null);
    try {
      const res = await api.post(`http://localhost:8000/api/v1/knowledge-graph/generate-socratic-from-practice`, {
        practice_content: practiceContent,
        concept_name: conceptName,
        question_type: 'open_ended'
      });
      let newQuestions: any[] = [];
      if (Array.isArray(res.data.socratic_questions)) {
        newQuestions = res.data.socratic_questions;
      } else if (res.data.socratic_questions && typeof res.data.socratic_questions === 'string') {
        try {
          newQuestions = JSON.parse(res.data.socratic_questions);
        } catch (e) {
          newQuestions = [{ socratic_question: res.data.socratic_questions }];
        }
      }
      setSocraticFromPractice(prev => ({ ...prev, [lessonIndex]: newQuestions }));
    } catch (err: any) {
      setSocraticFromPracticeError(err?.response?.data?.detail || err.message || 'Failed to generate socratic questions from practice');
    } finally {
      setSocraticFromPracticeLoading(prev => ({ ...prev, [lessonIndex]: false }));
    }
  };

  // Hint and Scaffold handlers
  const handleGenerateHint = async (questionIndex: number, problem: string) => {
    setHintLoading(prev => ({ ...prev, [questionIndex]: true }));
    try {
      const res = await api.post('http://localhost:8000/api/v1/knowledge-graph/generate-hints', {
        problem: problem,
        grade: 10
      });
      setHintData(prev => ({ ...prev, [questionIndex]: res.data }));
    } catch (err: any) {
      console.error('Failed to generate hint:', err);
    } finally {
      setHintLoading(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleGenerateScaffold = async (questionIndex: number, problem: string) => {
    setScaffoldLoading(prev => ({ ...prev, [questionIndex]: true }));
    try {
      const res = await api.post('http://localhost:8000/api/v1/knowledge-graph/generate-scaffold', {
        problem_statement: problem,
        grade_level: '10',
        subject_context: 'Mathematics',
        learning_objectives: 'Solve the given problem step by step'
      });
      setScaffoldData(prev => ({ ...prev, [questionIndex]: res.data }));
    } catch (err: any) {
      console.error('Failed to generate scaffold:', err);
    } finally {
      setScaffoldLoading(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleFetchMySubjects = async () => {
    try {
      setMySubjectsLoading(true);
      setMySubjectsError(null);
      
      const response = await api.get('/knowledge-graph/my-subjects');
      setMySubjects(response.data);
    } catch (error: any) {
      console.error('Error fetching my subjects:', error);
      setMySubjectsError(error.response?.data?.detail || 'Failed to fetch my subjects');
    } finally {
      setMySubjectsLoading(false);
    }
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={login} />;
  }

  // Main app content when authenticated
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Knowledge Graph Viewer</Typography>
      <Tabs 
        value={tab} 
        onChange={(_, v) => setTab(v)} 
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label="View Knowledge Graph" />
        <Tab label="Build Knowledge Graph" />
        <Tab label="Generate Questions by Subject" />
        <Tab label="Diagnostic Questions" />
        <Tab label="Concept Lessons" />
        <Tab label="Socratic Questions" />
        <Tab label="My Subjects" />
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
                        <TableCell>Hint</TableCell>
                        <TableCell>Scaffold</TableCell>
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
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleGenerateHint(i, q.problem_statement || q.question || q.text || '')}
                                  disabled={hintLoading[i]}
                                >
                                  {hintLoading[i] ? 'Loading...' : 'Hint'}
                                </Button>
                                {hintData[i] && (
                                  <Box mt={1} sx={{ maxWidth: 200 }}>
                                    <Typography variant="caption" color="text.secondary">Hints:</Typography>
                                    {hintData[i].hints && Array.isArray(hintData[i].hints) && hintData[i].hints.map((hint: any, idx: number) => (
                                      <Typography key={idx} variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                        {hint.level}. {hint.content}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleGenerateScaffold(i, q.problem_statement || q.question || q.text || '')}
                                  disabled={scaffoldLoading[i]}
                                >
                                  {scaffoldLoading[i] ? 'Loading...' : 'Scaffold'}
                                </Button>
                                {scaffoldData[i] && (
                                  <Box mt={1} sx={{ maxWidth: 200 }}>
                                    <Typography variant="caption" color="text.secondary">Steps:</Typography>
                                    {scaffoldData[i].scaffold && Array.isArray(scaffoldData[i].scaffold) && scaffoldData[i].scaffold.map((step: any, idx: number) => (
                                      <Typography key={idx} variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                        {idx + 1}. {step.step_description}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
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
            <Button 
              variant="contained" 
              onClick={handleQuickGenerateQuestions} 
              disabled={quickQuestionsLoading || !quickSubject}
              startIcon={quickQuestionsLoading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {quickQuestionsLoading ? 'Generating Questions...' : 'Generate Questions'}
            </Button>
          </Box>
          {quickQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof quickQuestionsError === 'string' ? quickQuestionsError : JSON.stringify(quickQuestionsError)}</Alert>}
          {quickQuestionsLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <CircularProgress size={40} />
                <Typography variant="body1" color="text.secondary">
                  Generating questions for {quickSubject}...
                </Typography>
              </Box>
            </Box>
          )}
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
                    <TableCell>Hint</TableCell>
                    <TableCell>Scaffold</TableCell>
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
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleGenerateHint(i, q.problem_statement || q.question || q.text || '')}
                            disabled={hintLoading[i]}
                            startIcon={hintLoading[i] ? <CircularProgress size={12} /> : null}
                          >
                            {hintLoading[i] ? 'Generating...' : 'Hint'}
                          </Button>
                          {hintData[i] && (
                            <Box mt={1} sx={{ maxWidth: 200 }}>
                              <Typography variant="caption" color="text.secondary">Hints:</Typography>
                              {hintData[i].hints && Array.isArray(hintData[i].hints) && hintData[i].hints.map((hint: any, idx: number) => (
                                <Typography key={idx} variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                  {hint.level}. {hint.content}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleGenerateScaffold(i, q.problem_statement || q.question || q.text || '')}
                            disabled={scaffoldLoading[i]}
                            startIcon={scaffoldLoading[i] ? <CircularProgress size={12} /> : null}
                          >
                            {scaffoldLoading[i] ? 'Generating...' : 'Scaffold'}
                          </Button>
                          {scaffoldData[i] && (
                            <Box mt={1} sx={{ maxWidth: 200 }}>
                              <Typography variant="caption" color="text.secondary">Steps:</Typography>
                              {scaffoldData[i].scaffold && Array.isArray(scaffoldData[i].scaffold) && scaffoldData[i].scaffold.map((step: any, idx: number) => (
                                <Typography key={idx} variant="body2" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                  {idx + 1}. {step.step_description}
                                </Typography>
                              ))}
                            </Box>
                          )}
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
      {tab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>Generate Diagnostic Questions</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Subject Name"
                value={diagnosticSubject}
                onChange={e => setDiagnosticSubject(e.target.value)}
                required
                placeholder="Enter subject name (e.g., AP Calculus AB)"
              />
              <Typography variant="body2" color="text.secondary">
                Will generate 6 diagnostic questions: 2 Easy, 2 Medium, 2 Hard (all Multiple Choice)
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleGenerateDiagnosticQuestions} 
                disabled={diagnosticQuestionsLoading || !diagnosticSubject}
                startIcon={diagnosticQuestionsLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {diagnosticQuestionsLoading ? 'Generating Diagnostic Questions...' : 'Generate Diagnostic Questions'}
              </Button>
            </Box>
          </Paper>
          {diagnosticQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof diagnosticQuestionsError === 'string' ? diagnosticQuestionsError : JSON.stringify(diagnosticQuestionsError)}</Alert>}
          {diagnosticQuestionsLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <CircularProgress size={40} />
                <Typography variant="body1" color="text.secondary">
                  Generating diagnostic questions for {diagnosticSubject}...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Creating 2 Easy, 2 Medium, and 2 Hard questions
                </Typography>
              </Box>
            </Box>
          )}
          {diagnosticQuestions && diagnosticQuestions.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Question</TableCell>
                    <TableCell>Difficulty</TableCell>
                    <TableCell>Options</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {diagnosticQuestions.map((q, i) => {
                    const questionData = q.diagnostic_question || q;
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{questionData.question_text || questionData.question || ''}</TableCell>
                        <TableCell><Chip label={questionData.difficulty || 'N/A'} size="small" /></TableCell>
                        <TableCell>
                          {questionData.options && Array.isArray(questionData.options) ? (
                            <Box display="flex" flexDirection="column" gap={1}>
                              {questionData.options.map((opt: string, idx: number) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    p: 1,
                                    backgroundColor: '#fafafa',
                                    '&:hover': {
                                      backgroundColor: '#f0f0f0',
                                      borderColor: '#bdbdbd'
                                    }
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                  {String.fromCharCode(65 + idx)}. {opt}
                                </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No options</Typography>
                          )}
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
      {tab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>Generate Concept Lessons</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Subject Name"
                value={lessonsSubject}
                onChange={e => setLessonsSubject(e.target.value)}
                required
                placeholder="Enter subject name to generate 3 lessons"
              />
              <Typography variant="body2" color="text.secondary">
                Will generate 3 lessons for Grade 8, Beginner level
              </Typography>
              <Button variant="contained" onClick={handleGenerateLessons} disabled={lessonsLoading || !lessonsSubject}>
                {lessonsLoading ? 'Generating...' : 'Generate Lessons'}
              </Button>
            </Box>
          </Paper>
          {lessonsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof lessonsError === 'string' ? lessonsError : JSON.stringify(lessonsError)}</Alert>}
          {lessons && lessons.length > 0 && (
            <Box display="flex" flexDirection="column" gap={3}>
              {lessons.map((lesson, i) => (
                <Paper 
                  key={i} 
                  sx={{ 
                    p: 3, 
                    border: '2px solid #e3f2fd',
                    borderRadius: 2,
                    backgroundColor: '#fafbfc',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    '&:hover': {
                      boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                      borderColor: '#2196f3'
                    }
                  }}
                >
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        backgroundColor: '#2196f3', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontWeight: 'bold'
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {lesson.title || lesson.concept_name || 'Untitled Lesson'}
                  </Typography>
                      <Typography variant="body2" color="text.secondary">
                    Concept: {lesson.concept_name} | Topic: {lesson.topic_name}
                  </Typography>
                    </Box>
                  </Box>
                  
                  {lesson.lesson_content && (
                    <Box mt={3}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Lesson Steps
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={2}>
                        {(() => {
                          try {
                            const content = typeof lesson.lesson_content === 'string' 
                              ? JSON.parse(lesson.lesson_content) 
                              : lesson.lesson_content;
                            
                            if (content.explanation && content.explanation.steps) {
                              return content.explanation.steps
                                .sort((a: any, b: any) => a.step_order - b.step_order)
                                .map((step: any, stepIndex: number) => (
                                  <Paper
                                    key={stepIndex}
                                    sx={{
                                      p: 2,
                                      border: step.isSocraticQuestion 
                                        ? '2px solid #ff9800' 
                                        : '2px solid #e3f2fd',
                                      borderRadius: 2,
                                      backgroundColor: step.isSocraticQuestion 
                                        ? '#fff3e0' 
                                        : '#fafbfc',
                                      position: 'relative',
                                      '&:hover': {
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                        borderColor: step.isSocraticQuestion 
                                          ? '#f57c00' 
                                          : '#2196f3'
                                      }
                                    }}
                                  >
                                    <Box display="flex" alignItems="center" mb={1}>
                                      <Box
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: '50%',
                                          backgroundColor: step.isSocraticQuestion 
                                            ? '#ff9800' 
                                            : '#2196f3',
                                          color: 'white',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          mr: 2,
                                          fontWeight: 'bold',
                                          fontSize: '14px'
                                        }}
                                      >
                                        {step.step_order}
                                      </Box>
                                      <Typography variant="h6" fontWeight="bold" color="primary">
                                        {step.step_type}
                                      </Typography>
                                      {step.isSocraticQuestion && (
                                        <Chip
                                          label="Practice Question"
                                          size="small"
                                          sx={{
                                            ml: 2,
                                            backgroundColor: '#ff9800',
                                            color: 'white'
                                          }}
                                        />
                                      )}
                                    </Box>
                                    <Typography variant="body1" sx={{ pl: 4 }}>
                                      {step.content}
                                    </Typography>
                                    {step.isSocraticQuestion && (
                                      <Box sx={{ pl: 4, mt: 2 }}>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          onClick={() => {
                                            // Extract concept name from lesson title or use a default
                                            const conceptName = lesson.concept_name || lesson.title || 'Unknown Concept';
                                            handleGenerateSocraticFromPractice(step.content, conceptName, i);
                                          }}
                                          disabled={socraticFromPracticeLoading[i] || false}
                                          startIcon={socraticFromPracticeLoading[i] ? <CircularProgress size={16} /> : null}
                                          sx={{
                                            borderColor: '#ff9800',
                                            color: '#ff9800',
                                            '&:hover': {
                                              borderColor: '#f57c00',
                                              backgroundColor: '#fff3e0'
                                            }
                                          }}
                                        >
                                          {socraticFromPracticeLoading[i] ? 'Generating...' : 'Generate Socratic Questions'}
                                        </Button>
                                      </Box>
                                    )}
                                  </Paper>
                                ));
                            } else {
                              // Fallback for non-structured content
                              return (
                                <Paper sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: 'white' }}>
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px' }}>
                          {JSON.stringify(lesson.lesson_content, null, 2)}
                        </pre>
                                </Paper>
                              );
                            }
                          } catch (e) {
                            // Fallback for parsing errors
                            return (
                              <Paper sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: 'white' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px' }}>
                                  {JSON.stringify(lesson.lesson_content, null, 2)}
                                </pre>
                              </Paper>
                            );
                          }
                        })()}
                      </Box>
                    </Box>
                  )}
                  
                  {lesson.example_question && (
                    <Box mt={3}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Example Question
                      </Typography>
                      <Box sx={{ 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2, 
                        p: 3, 
                        backgroundColor: 'white'
                      }}>
                        <Typography variant="body1">
                        {lesson.example_question}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Display Socratic Questions within this lesson */}
                  {socraticFromPractice[i] && socraticFromPractice[i].length > 0 && (
                    <Box mt={3}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Generated Socratic Questions
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={2}>
                        {socraticFromPractice[i].map((question: any, qIndex: number) => (
                          <Paper
                            key={qIndex}
                            sx={{
                              p: 3,
                              border: '2px solid #4caf50',
                              borderRadius: 2,
                              backgroundColor: '#f1f8e9',
                              '&:hover': {
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                borderColor: '#2e7d32'
                              }
                            }}
                          >
                            <Box display="flex" alignItems="center" mb={2}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 2,
                                  fontWeight: 'bold',
                                  fontSize: '14px'
                                }}
                              >
                                {qIndex + 1}
                              </Box>
                              <Typography variant="h6" fontWeight="bold" color="primary">
                                Socratic Question {qIndex + 1}
                              </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ pl: 4 }}>
                              {question.socratic_question || question}
                            </Typography>
                            {question.question_options && Array.isArray(question.question_options) && question.question_options.length > 0 && (
                              <Box mt={2} pl={4}>
                                <Paper
                                  sx={{
                                    p: 2,
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2,
                                    backgroundColor: '#fafafa',
                                    '&:hover': {
                                      backgroundColor: '#f5f5f5',
                                      borderColor: '#bdbdbd'
                                    }
                                  }}
                                >
                                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                                    Multiple Choice Options:
                                  </Typography>
                                  <Box display="flex" flexDirection="column" gap={1}>
                                    {question.question_options.map((opt: string, idx: number) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          border: '1px solid #e0e0e0',
                                          borderRadius: '4px',
                                          p: 1.5,
                                          backgroundColor: 'white',
                                          '&:hover': {
                                            backgroundColor: '#f0f0f0',
                                            borderColor: '#bdbdbd'
                                          }
                                        }}
                                      >
                                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                          {String.fromCharCode(65 + idx)}. {opt}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Paper>
                    </Box>
                  )}
                </Paper>
              ))}
                      </Box>
            </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
          
          {/* Display Socratic Questions from Practice */}
          {socraticFromPracticeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof socraticFromPracticeError === 'string' ? socraticFromPracticeError : JSON.stringify(socraticFromPracticeError)}
            </Alert>
          )}
        </Box>
      )}
      {tab === 5 && (
        <Box>
          <Typography variant="h6" gutterBottom>Generate Socratic Questions</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Subject Name"
                value={socraticSubject}
                onChange={e => setSocraticSubject(e.target.value)}
                required
              />
              <Box display="flex" gap={2}>
                <FormControl fullWidth>
                  <InputLabel>Question Type</InputLabel>
                  <Select
                    value={socraticForm.question_type}
                    label="Question Type"
                    onChange={e => handleSocraticFormChange('question_type', e.target.value)}
                  >
                    <MenuItem value="open_ended">Open Ended</MenuItem>
                    <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Number of Questions"
                  type="number"
                  value={socraticForm.num_questions}
                  onChange={e => handleSocraticFormChange('num_questions', parseInt(e.target.value))}
                  sx={{ width: 150 }}
                />
              </Box>
              <Button variant="contained" onClick={handleGenerateSocraticQuestions} disabled={socraticQuestionsLoading || !socraticSubject}>
                {socraticQuestionsLoading ? 'Generating...' : 'Generate Socratic Questions'}
              </Button>
            </Box>
          </Paper>
          {socraticQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof socraticQuestionsError === 'string' ? socraticQuestionsError : JSON.stringify(socraticQuestionsError)}</Alert>}
          {socraticQuestions && socraticQuestions.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Concept</TableCell>
                    <TableCell>Socratic Question</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Options</TableCell>
                    <TableCell>Reasoning</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {socraticQuestions.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{q.concept_name || 'N/A'}</TableCell>
                      <TableCell>{q.socratic_question || ''}</TableCell>
                      <TableCell><Chip label={socraticForm.question_type} size="small" /></TableCell>
                      <TableCell>
                        {q.question_options && Array.isArray(q.question_options) ? (
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            {q.question_options.map((opt: string, idx: number) => (
                              <Typography key={idx} variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {String.fromCharCode(65 + idx)}. {opt}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No options</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.reasoning || 'No reasoning provided'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      {tab === 6 && (
        <Box>
          <Typography variant="h6" gutterBottom>My Subjects</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button 
                variant="contained" 
                onClick={handleFetchMySubjects} 
                disabled={mySubjectsLoading}
              >
                {mySubjectsLoading ? 'Loading...' : 'Load My Subjects'}
              </Button>
            </Box>
          </Paper>
          {mySubjectsError && <Alert severity="error" sx={{ mb: 2 }}>{mySubjectsError}</Alert>}
          {mySubjects && mySubjects.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Topics</TableCell>
                    <TableCell>Concepts</TableCell>
                    <TableCell>Last Update</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mySubjects.map((subject, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold">
                          {subject.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {subject.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={subject.topic_total} color="primary" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={subject.concept_total} color="secondary" size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {subject.update_at ? new Date(subject.update_at).toLocaleString() : 'Never updated'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {mySubjects && mySubjects.length === 0 && (
            <Alert severity="info">
              You haven't created any subjects yet. Use the "Build Knowledge Graph" tab to create your first subject.
            </Alert>
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

function App() {
  return (
    <AuthProvider>
      <Header />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
