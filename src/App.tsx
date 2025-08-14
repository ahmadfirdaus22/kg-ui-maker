import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Tabs, Tab, Paper, Button, TextField, Chip, Checkbox, LinearProgress } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import SubjectSelector from './components/SubjectSelector';
import GraphViewer from './components/GraphViewer';
import TableView from './components/TableView';
import Header from './components/Header';
import Login from './components/Login';
import SystemPromptEditor from './components/SystemPromptEditor';
import ConceptSlideshow from './components/ConceptSlideshow';
import ContentTemplates from './components/ContentTemplates';
import AgentPlayground from './components/AgentPlayground';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api from './utils/axios';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import { Box as MuiBox } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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

// Interfaces for edit state data types
export interface PracticeQuestionData {
  question: string;
  difficulty: string;
  max_point: number;
  rubric: string;
  hint?: string;
  scaffold?: string;
}

export interface DiagnosticQuestionData {
  question_text: string;
  difficulty: string;
  max_point: number;
  rubric: string;
  options?: string[];
  correct_answer?: string;
}

export interface SocraticQuestionData {
  socratic_question: string;
  reasoning: string;
  question_options?: string[];
}

export interface LessonData {
  title: string;
  content: string;
  grade: string;
  mastery_level: string;
}

export interface HintData {
  hint: string;
  reasoning: string;
}

export interface ScaffoldData {
  scaffold: string;
  reasoning: string;
}

export interface GeneratedDiagnosticQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  options?: string[];
  correct_answer?: string;
  concept_name?: string;
}

export interface GeneratedPracticeProblem {
  id: string;
  problem_statement: string;
  difficulty_level: string;
  assessment_rubric?: any;
  max_point?: number;
  concept_name?: string;
}

export interface ConceptQuestionsResponse {
  diagnostic_questions: GeneratedDiagnosticQuestion[];
  practice_problems: GeneratedPracticeProblem[];
}

function AppContent() {
  const { isAuthenticated, login, authLoading } = useAuth();
  const [tab, setTab] = useState(0);
  
  // System Prompt Editor state
  const [systemPromptEditorOpen, setSystemPromptEditorOpen] = useState(false);
  const [dataModified, setDataModified] = useState(false);
  
  // View tab state
  const [subject, setSubject] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  // Build tab state
  const [buildForm, setBuildForm] = useState({ subjectName: '', subjectDescription: '', gradeLevel: 10, allowTutorChatDuringTest: false, files: [] as File[] });
  const [buildData, setBuildData] = useState<KnowledgeGraphData | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildJobId, setBuildJobId] = useState<string | null>(null);
  const [buildJobStatus, setBuildJobStatus] = useState<'running' | 'completed' | 'failed' | 'cancelled' | null>(null);
  const [buildProgress, setBuildProgress] = useState<{ current_step?: string; total_steps?: number; current_step_number?: number; error_message?: string } | null>(null);
  const buildPollRef = useRef<any>(null);
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

  // Optimizer state for all tabs
  const [optimizerStates, setOptimizerStates] = useState<{
    questions: { loading: boolean; error: string | null; success: string | null };
    diagnostic: { loading: boolean; error: string | null; success: string | null };
    lessons: { loading: boolean; error: string | null; success: string | null };
    socratic: { loading: boolean; error: string | null; success: string | null };
    hints: { loading: boolean; error: string | null; success: string | null };
    scaffold: { loading: boolean; error: string | null; success: string | null };
    quick: { loading: boolean; error: string | null; success: string | null };
  }>({
    questions: { loading: false, error: null, success: null },
    diagnostic: { loading: false, error: null, success: null },
    lessons: { loading: false, error: null, success: null },
    socratic: { loading: false, error: null, success: null },
    hints: { loading: false, error: null, success: null },
    scaffold: { loading: false, error: null, success: null },
    quick: { loading: false, error: null, success: null }
  });

  // Feedback state for all generated content
  const [feedbackStates, setFeedbackStates] = useState({
    questions: {} as { [idx: number]: 'up' | 'down' | null },
    diagnostic: {} as { [idx: number]: 'up' | 'down' | null },
    lessons: {} as { [idx: number]: 'up' | 'down' | null },
    socratic: {} as { [idx: number]: 'up' | 'down' | null },
    hints: {} as { [idx: number]: 'up' | 'down' | null },
    scaffold: {} as { [idx: number]: 'up' | 'down' | null }
  });

  // Edit state for all generated content
  const [editStates, setEditStates] = useState<{
    questions: { open: boolean; index: number | null; data: PracticeQuestionData | null };
    diagnostic: { open: boolean; index: number | null; data: DiagnosticQuestionData | null };
    lessons: { open: boolean; index: number | null; data: LessonData | null };
    socratic: { open: boolean; index: number | null; data: SocraticQuestionData | null };
    hints: { open: boolean; index: number | null; data: HintData | null };
    scaffold: { open: boolean; index: number | null; data: ScaffoldData | null };
  }>({
    questions: { open: false, index: null, data: null },
    diagnostic: { open: false, index: null, data: null },
    lessons: { open: false, index: null, data: null },
    socratic: { open: false, index: null, data: null },
    hints: { open: false, index: null, data: null },
    scaffold: { open: false, index: null, data: null }
  });

  // Socratic Questions from Practice Questions state
  const [socraticFromPractice, setSocraticFromPractice] = useState<{ [lessonIndex: number]: any[] }>({});
  const [socraticFromPracticeLoading, setSocraticFromPracticeLoading] = useState<{ [lessonIndex: number]: boolean }>({});
  const [socraticFromPracticeError, setSocraticFromPracticeError] = useState<string | null>(null);

  // My Subjects state
  const [mySubjects, setMySubjects] = useState<any[] | null>(null);
  const [mySubjectsLoading, setMySubjectsLoading] = useState(false);
  const [mySubjectsError, setMySubjectsError] = useState<string | null>(null);
  const [mySubjectsSearch, setMySubjectsSearch] = useState<string>('');

  // Hint and Scaffold state
  const [hintData, setHintData] = useState<{ [key: number]: any }>({});
  const [scaffoldData, setScaffoldData] = useState<{ [key: number]: any }>({});
  const [hintLoading, setHintLoading] = useState<{ [key: number]: boolean }>({});
  const [scaffoldLoading, setScaffoldLoading] = useState<{ [key: number]: boolean }>({});

  // Generate Questions by Concepts state
  const [conceptSubject, setConceptSubject] = useState('');
  const [conceptTopics, setConceptTopics] = useState<any[]>([]);
  const [conceptConcepts, setConceptConcepts] = useState<any[]>([]);
  const [conceptSubjects, setConceptSubjects] = useState<any[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [conceptQuestionsLoading, setConceptQuestionsLoading] = useState(false);
  const [conceptQuestionsError, setConceptQuestionsError] = useState<string | null>(null);
  const [conceptQuestions, setConceptQuestions] = useState<ConceptQuestionsResponse | null>(null);
  const [conceptsLoading, setConceptsLoading] = useState(false);

  // Cross-Subject Relations state
  const [crossSubjectRelations, setCrossSubjectRelations] = useState<{
    cross_prereq_relations: any[];
    cross_relates_relations: any[];
    total_cross_subject_relations: number;
  } | null>(null);
  const [crossSubjectRelationsLoading, setCrossSubjectRelationsLoading] = useState(false);
  const [crossSubjectRelationsError, setCrossSubjectRelationsError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  // Background Question Generation state
  const [backgroundJobs, setBackgroundJobs] = useState<any[]>([]);
  const [backgroundJobsLoading, setBackgroundJobsLoading] = useState(false);
  const [backgroundJobsError, setBackgroundJobsError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<any>(null);
  const [jobStatusLoading, setJobStatusLoading] = useState(false);

  // Optimizer Jobs state
  const [optimizerJobs, setOptimizerJobs] = useState<any[]>([]);
  const [optimizerJobsLoading, setOptimizerJobsLoading] = useState(false);
  const [optimizerJobsError, setOptimizerJobsError] = useState<string | null>(null);

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
    if (subject) {
      fetchData(subject);
      setDataModified(false);
    }
  };

  // Build tab logic
  const handleBuildChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBuildForm(f => ({ ...f, [name]: name === 'gradeLevel' ? value : value }));
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
      formData.append('grade_level', String(buildForm.gradeLevel));
      formData.append('allow_tutor_chat_during_test', String(buildForm.allowTutorChatDuringTest));
      
      // Debug: Log what we're sending
      console.log('Form data being sent:', {
        subject_name: buildForm.subjectName,
        subject_description: buildForm.subjectDescription,
        grade_level: buildForm.gradeLevel,
        allow_tutor_chat_during_test: buildForm.allowTutorChatDuringTest,
        files_count: buildForm.files?.length || 0
      });
      
      const res = await api.post('/knowledge-graph/build', formData);
      const jobId = res.data?.job_id;
      if (jobId) {
        setBuildJobId(jobId);
        setBuildJobStatus('running');
      } else {
        throw new Error('No job_id returned from build endpoint');
      }
    } catch (err: any) {
      console.error('Build error:', err);
      setBuildError(err?.response?.data?.detail || err.message || 'Failed to build knowledge graph');
      setBuildLoading(false);
    }
  };
  const handleBuildRefresh = () => {
    if (buildForm.subjectName) {
      api.get(`/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`)
        .then(res => {
          setBuildData(res.data);
          setDataModified(false);
        });
    }
  };

  // Poll build job status when running
  useEffect(() => {
    const startPolling = () => {
      if (!buildJobId) return;
      if (buildPollRef.current) clearInterval(buildPollRef.current);
      buildPollRef.current = setInterval(async () => {
        try {
          const resp = await api.get(`/knowledge-graph/build/status/${buildJobId}`);
          const data = resp.data;
          setBuildJobStatus(data?.status || null);
          setBuildProgress(data?.progress || null);
          if (data?.status && data.status !== 'running') {
            clearInterval(buildPollRef.current);
            buildPollRef.current = null;
            setBuildLoading(false);
            if (data.status === 'completed') {
              try {
                const kg = await api.get(`/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}`);
                setBuildData(kg.data);
              } catch (e: any) {
                setBuildError(e?.response?.data?.detail || e.message || 'Build completed, but failed to fetch knowledge graph');
              }
            } else if (data.status === 'failed' || data.status === 'cancelled') {
              setBuildError(data?.progress?.error_message || `Job ${data.status}`);
            }
          }
        } catch (e: any) {
          clearInterval(buildPollRef.current);
          buildPollRef.current = null;
          setBuildLoading(false);
          setBuildError(e?.response?.data?.detail || e.message || 'Failed to get build status');
        }
      }, 2000);
    };

    if (buildJobId && buildJobStatus === 'running') {
      startPolling();
    }

    return () => {
      if (buildPollRef.current) {
        clearInterval(buildPollRef.current);
        buildPollRef.current = null;
      }
    };
  }, [buildJobId, buildJobStatus]);
  // Generate questions
  const handleGenerateQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions(null);
    try {
      const res = await api.post(`/knowledge-graph/subject/${encodeURIComponent(buildForm.subjectName)}/generate-questions`);
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
    await handleOptimizeQuestions();
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
      const res = await api.post(`/knowledge-graph/subject/${encodeURIComponent(quickSubject)}/generate-questions`);
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
      const res = await api.post(`/knowledge-graph/subject/${encodeURIComponent(diagnosticSubject)}/generate-diagnostic-questions`);
      
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
      const res = await api.post(`/knowledge-graph/subject/${encodeURIComponent(lessonsSubject)}/generate-concept-lessons`);
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
      const res = await api.post(`/knowledge-graph/subject/${encodeURIComponent(socraticSubject)}/generate-socratic-questions`, socraticForm);
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
    try {
      setSocraticFromPracticeLoading(prev => ({ ...prev, [lessonIndex]: true }));
      setSocraticFromPracticeError(null);
      
      const response = await api.post('/knowledge-graph/generate-socratic-from-practice', {
        practice_content: practiceContent,
        concept_name: conceptName,
        question_type: 'multiple_choice',
        subject_name: lessonsSubject
      });
      
      if (response.data.socratic_questions && response.data.socratic_questions.length > 0) {
        setSocraticFromPractice(prev => ({ ...prev, [lessonIndex]: response.data.socratic_questions }));
      } else {
        setSocraticFromPractice(prev => ({ ...prev, [lessonIndex]: [] }));
      }
    } catch (error: any) {
      console.error('Error generating Socratic questions from practice:', error);
      setSocraticFromPracticeError(error.response?.data?.detail || error.message || 'Failed to generate Socratic questions');
    } finally {
      setSocraticFromPracticeLoading(prev => ({ ...prev, [lessonIndex]: false }));
    }
  };

  // Optimizer handlers for all tabs
  const handleOptimizeQuestions = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, questions: { loading: true, error: null, success: null } }));
      
      const dataset = buildOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${buildForm.subjectName}/optimize-question-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        questions: { loading: false, error: null, success: response.data.message || 'Question optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing questions:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        questions: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize questions', success: null }
      }));
    }
  };

  const handleOptimizeDiagnostic = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, diagnostic: { loading: true, error: null, success: null } }));
      
      const dataset = buildDiagnosticOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${diagnosticSubject}/optimize-diagnostic-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        diagnostic: { loading: false, error: null, success: response.data.message || 'Diagnostic optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing diagnostic questions:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        diagnostic: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize diagnostic questions', success: null }
      }));
    }
  };

  const handleOptimizeLessons = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, lessons: { loading: true, error: null, success: null } }));
      
      const dataset = buildLessonsOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${lessonsSubject}/optimize-concept-lesson-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        lessons: { loading: false, error: null, success: response.data.message || 'Lesson optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing lessons:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        lessons: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize lessons', success: null }
      }));
    }
  };

  const handleOptimizeSocratic = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, socratic: { loading: true, error: null, success: null } }));
      
      const dataset = buildSocraticOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${socraticSubject}/optimize-socratic-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        socratic: { loading: false, error: null, success: response.data.message || 'Socratic optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing Socratic questions:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        socratic: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize Socratic questions', success: null }
      }));
    }
  };

  const handleOptimizeHints = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, hints: { loading: true, error: null, success: null } }));
      
      const dataset = buildHintsOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${buildForm.subjectName}/optimize-hint-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        hints: { loading: false, error: null, success: response.data.message || 'Hint optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing hints:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        hints: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize hints', success: null }
      }));
    }
  };

  const handleOptimizeScaffold = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, scaffold: { loading: true, error: null, success: null } }));
      
      const dataset = buildScaffoldOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${buildForm.subjectName}/optimize-scaffold-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        scaffold: { loading: false, error: null, success: response.data.message || 'Scaffold optimizer trained successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing scaffold:', error);
      setOptimizerStates(prev => ({ 
        ...prev, 
        scaffold: { loading: false, error: error.response?.data?.detail || error.message || 'Failed to optimize scaffold', success: null }
      }));
    }
  };

  const handleOptimizeQuick = async () => {
    try {
      setOptimizerStates(prev => ({ ...prev, quick: { loading: true, error: null, success: null } }));
      
      const dataset = buildQuickOptimizerDataset();
      const response = await api.post(`/knowledge-graph/subject/${quickSubject}/optimize-question-generator`, { dataset });
      
      setOptimizerStates(prev => ({ 
        ...prev, 
        quick: { loading: false, error: null, success: response.data.message || 'Quick question generator optimized successfully!' }
      }));
    } catch (error: any) {
      console.error('Error optimizing quick questions:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to optimize quick question generator';
      setOptimizerStates(prev => ({ 
        ...prev, 
        quick: { loading: false, error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), success: null }
      }));
    }
  };

  // Dataset builders for optimizers
  const buildDiagnosticOptimizerDataset = () => {
    if (!diagnosticQuestions || !Array.isArray(diagnosticQuestions)) return [];
    
    return diagnosticQuestions.map((q, idx) => ({
      concept_name: q.concept_name || 'Unknown Concept',
      concept_description: q.concept_description || 'No description',
      difficulty_level: q.difficulty || 'medium',
      question_type: 'multiple_choice',
      context: `Diagnostic assessment for ${diagnosticSubject}`,
      expected_difficulty: q.difficulty || 'medium',
      expected_question_type: 'multiple_choice',
      expected_options_count: 4,
      expected_has_hints: true,
      thumbs: { up: feedbackStates.diagnostic[idx] === 'up' ? [0] : [], down: feedbackStates.diagnostic[idx] === 'down' ? [0] : [] }
    }));
  };

  const buildLessonsOptimizerDataset = () => {
    if (!lessons || !Array.isArray(lessons)) return [];
    
    return lessons.map((lesson, idx) => ({
      subject: lessonsSubject,
      topic: lesson.topic_name || 'Unknown Topic',
      concept: lesson.concept_name || 'Unknown Concept',
      grade: '8',
      mastery_level: 'beginner',
      expected_lesson_structure: ['title', 'concept', 'explanation'],
      expected_steps_count: 3,
      expected_has_socratic: true,
      expected_keywords_count: 3,
      thumbs: { up: feedbackStates.lessons[idx] === 'up' ? [0] : [], down: feedbackStates.lessons[idx] === 'down' ? [0] : [] }
    }));
  };

  const buildSocraticOptimizerDataset = () => {
    if (!socraticQuestions || !Array.isArray(socraticQuestions)) return [];
    
    return socraticQuestions.map((q, idx) => ({
      concept_name: q.concept_name || 'Unknown Concept',
      example_question: q.socratic_question || 'No example question',
      previous_questions: '',
      question_type: socraticForm.question_type,
      expected_question_type: socraticForm.question_type,
      expected_options_count: socraticForm.question_type === 'multiple_choice' ? 4 : 0,
      expected_has_reasoning: true,
      thumbs: { up: feedbackStates.socratic[idx] === 'up' ? [0] : [], down: feedbackStates.socratic[idx] === 'down' ? [0] : [] }
    }));
  };

  const buildHintsOptimizerDataset = () => {
    if (!questions || !Array.isArray(questions)) return [];
    
    return questions.map((q, idx) => ({
      problem: q.problem_statement || q.question || q.text || '',
      grade: 10,
      expected_hint_types: ['CONCEPTUAL', 'STRATEGIC'],
      expected_hint_levels: [1, 2, 3],
      expected_content: 'hint content',
      thumbs: { up: feedbackStates.hints[idx] === 'up' ? [0] : [], down: feedbackStates.hints[idx] === 'down' ? [0] : [] }
    }));
  };

  const buildScaffoldOptimizerDataset = () => {
    if (!questions || !Array.isArray(questions)) return [];
    
    return questions.map((q, idx) => ({
      problem_statement: q.problem_statement || q.question || q.text || '',
      grade_level: '10',
      subject_context: buildForm.subjectName,
      learning_objectives: 'Understand and solve the problem',
      expected_steps_count: 3,
      expected_rubric_criteria: ['understanding', 'application'],
      thumbs: { up: feedbackStates.scaffold[idx] === 'up' ? [0] : [], down: feedbackStates.scaffold[idx] === 'down' ? [0] : [] }
    }));
  };

  const buildQuickOptimizerDataset = () => {
    if (!quickQuestions || !Array.isArray(quickQuestions)) return [];
    
    const dataset = quickQuestions.map((q, idx) => ({
      subject: quickSubject,
      topic: 'General',
      concept: 'Practice Problem',
      grade_level: '10',
      assessment_type: 'open_ended',
      num_questions: 1,
      context: `Practice problem for ${quickSubject}`,
      expected_difficulty: q.difficulty_level || 'medium',
      expected_question: q.problem_statement || q.question || q.text || '',
      expected_max_point: q.max_point || 10,
      thumbs: { up: questionFeedback[idx] === 'up' ? [0] : [], down: questionFeedback[idx] === 'down' ? [0] : [] }
    }));
    
    return dataset;
  };

  // Feedback handlers for all content types
  const handleFeedback = (contentType: string, idx: number, type: 'up' | 'down') => {
    setFeedbackStates(prev => ({
      ...prev,
      [contentType]: {
        ...prev[contentType as keyof typeof prev],
        [idx]: prev[contentType as keyof typeof prev][idx] === type ? null : type
      }
    }));
  };

  // Edit handlers for all content types
  const handleEditOpen = (contentType: string, idx: number, data: any) => {
    setEditStates(prev => ({
      ...prev,
      [contentType]: { open: true, index: idx, data: { ...data } }
    }));
  };

  const handleEditClose = (contentType: string) => {
    setEditStates(prev => ({
      ...prev,
      [contentType]: { open: false, index: null, data: null }
    }));
  };

  const handleEditChange = (contentType: string, field: string, value: any) => {
    setEditStates(prev => ({
      ...prev,
      [contentType]: {
        ...prev[contentType as keyof typeof prev],
        data: {
          ...prev[contentType as keyof typeof prev].data,
          [field]: value
        }
      }
    }));
  };

  const handleEditSave = (contentType: string) => {
    const editState = editStates[contentType as keyof typeof editStates];
    if (editState.index !== null && editState.data) {
      // Update the corresponding data array
      const dataSetters: Record<string, React.Dispatch<React.SetStateAction<any[] | null>>> = {
        questions: setQuestions,
        diagnostic: setDiagnosticQuestions,
        lessons: setLessons,
        socratic: setSocraticQuestions
      };
      
      const dataSetter = dataSetters[contentType];
      if (dataSetter) {
        dataSetter((prev: any) => {
          if (Array.isArray(prev)) {
            const updated = [...prev];
            updated[editState.index!] = editState.data;
            return updated;
          }
          return prev;
        });
      }
    }
    handleEditClose(contentType);
  };

  // Hint and Scaffold handlers
  const handleGenerateHint = async (questionIndex: number, problem: string) => {
    setHintLoading(prev => ({ ...prev, [questionIndex]: true }));
    try {
      const res = await api.post('/knowledge-graph/generate-hints', {
        problem: problem,
        grade: 10,
        subject_name: buildForm.subjectName || quickSubject || diagnosticSubject || lessonsSubject || socraticSubject
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
      const res = await api.post('/knowledge-graph/generate-scaffold', {
        problem_statement: problem,
        grade_level: '10',
        subject_context: buildForm.subjectName || quickSubject || diagnosticSubject || lessonsSubject || socraticSubject,
        learning_objectives: 'Solve the given problem step by step',
        subject_name: buildForm.subjectName || quickSubject || diagnosticSubject || lessonsSubject || socraticSubject
      });
      setScaffoldData(prev => ({ ...prev, [questionIndex]: res.data }));
    } catch (err: any) {
      console.error('Failed to generate scaffold:', err);
    } finally {
      setScaffoldLoading(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleFetchMySubjects = async (searchTerm?: string) => {
    try {
      setMySubjectsLoading(true);
      setMySubjectsError(null);
      
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.trim()) {
        params.append('name', searchTerm.trim());
      }
      
      const response = await api.get(`/knowledge-graph/my-subjects?${params.toString()}`);
      setMySubjects(response.data);
    } catch (error: any) {
      console.error('Error fetching my subjects:', error);
      setMySubjectsError(error.response?.data?.detail || 'Failed to fetch my subjects');
    } finally {
      setMySubjectsLoading(false);
    }
  };

  const handleSearchMySubjects = () => {
    handleFetchMySubjects(mySubjectsSearch);
  };

  const handleClearSearch = () => {
    setMySubjectsSearch('');
    handleFetchMySubjects();
  };

  // Concept-based question generation handlers
  const handleFetchConceptSubjects = async () => {
    try {
      const response = await api.get('/knowledge-graph/with-id/subjects');
      setConceptSubjects(response.data || []);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      setConceptSubjects([]);
    }
  };

  const handleConceptSubjectChange = async (subjectId: string) => {
    const selectedSubject = conceptSubjects.find((s: any) => s.id === subjectId);
    if (selectedSubject) {
      setConceptSubject(selectedSubject.name);
    } else {
      setConceptSubject('');
    }
    
    setSelectedConcepts([]);
    setConceptQuestions(null);
    
    if (!subjectId) {
      setConceptTopics([]);
      setConceptConcepts([]);
      return;
    }

    try {
      setConceptsLoading(true);
      
      // Get topics for this subject
      const topicsResponse = await api.get(`/knowledge-graph/with-id/topics?subject_id=${subjectId}`);
      console.log('Topics response:', topicsResponse.data);
      setConceptTopics(topicsResponse.data || []);
      
      // Get concepts for this subject
      const conceptsResponse = await api.get(`/knowledge-graph/with-id/concepts?subject_id=${subjectId}`);
      console.log('Concepts response:', conceptsResponse.data);
      setConceptConcepts(conceptsResponse.data || []);
      
    } catch (error: any) {
      console.error('Error fetching concepts and topics:', error);
      setConceptTopics([]);
      setConceptConcepts([]);
    } finally {
      setConceptsLoading(false);
    }
  };

  const handleConceptSelection = (conceptId: string) => {
    console.log('Selecting concept with ID:', conceptId);
    setSelectedConcepts(prev => {
      if (prev.includes(conceptId)) {
        console.log('Removing concept from selection');
        return prev.filter(id => id !== conceptId);
      } else {
        console.log('Adding concept to selection');
        return [...prev, conceptId];
      }
    });
  };

  const handleGenerateConceptQuestions = async () => {
    if (selectedConcepts.length === 0) {
      setConceptQuestionsError('Please select at least one concept');
      return;
    }

    try {
      setConceptQuestionsLoading(true);
      setConceptQuestionsError(null);

      const selectedConceptData = conceptConcepts.filter(concept => 
        selectedConcepts.includes(concept.id)
      );

      const response = await api.post('/generate-questions/for-concept', {
        concept_ids: selectedConcepts,
        num_per_difficulty: 2 // Generate 2 questions per difficulty level
      });

      setConceptQuestions(response.data);
    } catch (error: any) {
      console.error('Error generating concept questions:', error);
      setConceptQuestionsError(error.response?.data?.detail || 'Failed to generate questions');
    } finally {
      setConceptQuestionsLoading(false);
    }
  };

  // Cross-Subject Relations handlers
  const handleCheckCrossSubjectRelations = async () => {
    setCrossSubjectRelationsLoading(true);
    setCrossSubjectRelationsError(null);
    try {
      const res = await api.get('/knowledge-graph/check-cross-subject-relations');
      setCrossSubjectRelations(res.data.result);
    } catch (err: any) {
      setCrossSubjectRelationsError(err?.response?.data?.detail || err.message || 'Failed to check cross-subject relations');
    } finally {
      setCrossSubjectRelationsLoading(false);
    }
  };

  const handleCleanupCrossSubjectRelations = async () => {
    setCleanupLoading(true);
    setCleanupError(null);
    try {
      const res = await api.post('/knowledge-graph/cleanup-cross-subject-relations');
      setCleanupResult(res.data.result);
      // Refresh the relations after cleanup
      await handleCheckCrossSubjectRelations();
    } catch (err: any) {
      setCleanupError(err?.response?.data?.detail || err.message || 'Failed to cleanup cross-subject relations');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Background Question Generation handlers
  const handleFetchAvailableSubjects = async () => {
    setSubjectsLoading(true);
    try {
      // Try the with-id endpoint first as it's more suitable for background generation
      const res = await api.get('/knowledge-graph/with-id/subjects');
      const subjects = res.data || [];
      setAvailableSubjects(subjects);
      console.log('Fetched subjects:', subjects);
    } catch (err: any) {
      console.error('Failed to fetch subjects with ID, trying my-subjects:', err);
      try {
        // Fallback to my-subjects endpoint
        const res = await api.get('/knowledge-graph/my-subjects');
        const subjects = res.data || [];
        setAvailableSubjects(subjects);
        console.log('Fetched subjects from my-subjects:', subjects);
      } catch (fallbackErr: any) {
        console.error('Failed to fetch subjects from my-subjects:', fallbackErr);
        setAvailableSubjects([]);
      }
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleFetchBackgroundJobs = async () => {
    setBackgroundJobsLoading(true);
    setBackgroundJobsError(null);
    try {
      const res = await api.get('/generate-questions/background/jobs');
      setBackgroundJobs(res.data || []);
    } catch (err: any) {
      setBackgroundJobsError(err?.response?.data?.detail || err.message || 'Failed to fetch background jobs');
    } finally {
      setBackgroundJobsLoading(false);
    }
  };

  const handleStartBackgroundJob = async () => {
    if (!selectedSubject) {
      alert('Please select a subject first');
      return;
    }
    
    try {
      const res = await api.post('/generate-questions/background/start', {
        subject_id: selectedSubject,
        questions_per_concept: 5,
        include_diagnostic: true,
        include_practice: true
      });
      
      alert(`Background job started! Job ID: ${res.data.job_id}`);
      // Refresh jobs list
      await handleFetchBackgroundJobs();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Failed to start background job');
    }
  };

  const handleCheckJobStatus = async (jobId: string) => {
    setJobStatusLoading(true);
    try {
      const res = await api.get(`/generate-questions/background/status/${jobId}`);
      setCurrentJobStatus(res.data);
    } catch (err: any) {
      console.error('Failed to check job status:', err);
    } finally {
      setJobStatusLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to cancel this job? Completed work will be preserved.')) {
      return;
    }
    
    try {
      await api.post(`/generate-questions/background/cancel/${jobId}`);
      alert('Job cancelled successfully');
      // Refresh jobs list
      await handleFetchBackgroundJobs();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Failed to cancel job');
    }
  };

  // Optimizer Jobs functions
  const handleFetchOptimizerJobs = async () => {
    try {
      setOptimizerJobsLoading(true);
      setOptimizerJobsError(null);
      const res = await api.get('/knowledge-graph/optimizer/jobs');
      setOptimizerJobs(res.data || []);
    } catch (err: any) {
      setOptimizerJobsError(err?.response?.data?.detail || err.message || 'Failed to fetch optimizer jobs');
    } finally {
      setOptimizerJobsLoading(false);
    }
  };

  const handleCancelOptimizerJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to cancel this optimizer job? Completed work will be preserved.')) {
      return;
    }
    
    try {
      await api.post(`/knowledge-graph/optimizer/cancel/${jobId}`);
      alert('Optimizer job cancelled successfully');
      // Refresh optimizer jobs list
      await handleFetchOptimizerJobs();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Failed to cancel optimizer job');
    }
  };

  // System Prompt Editor handlers
  const handleOpenSystemPromptEditor = () => {
    setSystemPromptEditorOpen(true);
  };

  const handleCloseSystemPromptEditor = () => {
    setSystemPromptEditorOpen(false);
  };

  const getCurrentTabData = (): any => {
    switch (tab) {
      case 0: // View Knowledge Graph
        return data;
      case 1: // Build Knowledge Graph
        return buildData;
      case 2: // Generate Questions by Subject
        return quickQuestions;
      case 3: // Diagnostic Questions
        return diagnosticQuestions;
      case 4: // Concept Lessons
        return lessons;
      case 5: // Socratic Questions
        return socraticQuestions;
      case 6: // Generate Questions by Concepts
        return conceptQuestions;
      case 7: // My Subjects
        return mySubjects;
      case 8: // Cross-Subject Relations
        return crossSubjectRelations || null;
      case 9: // Background Question Generation
        return (Array.isArray(backgroundJobs) && backgroundJobs.length > 0) || !!currentJobStatus
          ? { backgroundJobs, currentJobStatus }
          : null;
      default:
        return null;
    }
  };

  const handleSystemPromptDataUpdate = (newData: any) => {
    switch (tab) {
      case 0: // View Knowledge Graph
        setData(newData);
        break;
      case 1: // Build Knowledge Graph
        setBuildData(newData);
        break;
      case 2: // Generate Questions by Subject
        setQuickQuestions(newData);
        break;
      case 3: // Diagnostic Questions
        setDiagnosticQuestions(newData);
        break;
      case 4: // Concept Lessons
        setLessons(newData);
        break;
      case 5: // Socratic Questions
        setSocraticQuestions(newData);
        break;
      case 6: // Generate Questions by Concepts
        setConceptQuestions(newData);
        break;
      case 7: // My Subjects
        setMySubjects(newData);
        break;
      case 8: // Cross-Subject Relations
        setCrossSubjectRelations(newData);
        break;
      case 9: // Background Question Generation
        if (newData.backgroundJobs) setBackgroundJobs(newData.backgroundJobs);
        if (newData.currentJobStatus) setCurrentJobStatus(newData.currentJobStatus);
        break;
    }
    setDataModified(true);
  };

  // Fetch subjects for concept selection when component mounts
  useEffect(() => {
    if (isAuthenticated && tab === 6) {
      handleFetchConceptSubjects();
    }
  }, [isAuthenticated, tab]);

  // Fetch subjects and jobs for background generation when component mounts
  useEffect(() => {
    if (isAuthenticated && tab === 9) {
      console.log('Tab 9 mounted, fetching subjects and jobs...');
      handleFetchAvailableSubjects();
      handleFetchBackgroundJobs();
      handleFetchOptimizerJobs();
    }
  }, [isAuthenticated, tab]);

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
        onChange={(_, v) => {
          setTab(v);
          setDataModified(false);
        }} 
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
        <Tab label="Generate Questions by Concepts" />
        <Tab label="My Subjects" />
        <Tab label="Cross-Subject Relations" />
        <Tab label="Background Question Generation" />
        <Tab label="Content Templates" />
        <Tab label="Agent Playground" />
      </Tabs>
      
      {/* System Prompt Editor Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant={dataModified ? "contained" : "outlined"}
          startIcon={<SettingsIcon />}
          onClick={handleOpenSystemPromptEditor}
          disabled={!getCurrentTabData()}
          color={dataModified ? "success" : "primary"}
        >
          System Prompt Editor {dataModified && "(Modified)"}
        </Button>
      </Box>

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
            <>
              {view === 'graph' ? <GraphViewer initialData={convertToGraphViewerData(data)} /> : <TableView data={data} onRefresh={handleRefresh} />}
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" size="small" onClick={() => setShowSlideshow(s => !s)}>
                  {showSlideshow ? 'Hide Concept Slideshow' : 'Show Concept Slideshow'}
                </Button>
              </Box>
              {showSlideshow && <ConceptSlideshow subject={subject} />}
            </>
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
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel id="grade-level-label">Grade Level</InputLabel>
                  <Select
                    labelId="grade-level-label"
                    label="Grade Level"
                    value={String(buildForm.gradeLevel)}
                    onChange={(e: SelectChangeEvent) => setBuildForm(f => ({ ...f, gradeLevel: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                      <MenuItem key={grade} value={String(grade)}>{grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box display="flex" alignItems="center" gap={1}>
                  <Checkbox
                    checked={buildForm.allowTutorChatDuringTest}
                    onChange={(e) => setBuildForm(f => ({ ...f, allowTutorChatDuringTest: e.target.checked }))}
                  />
                  <Typography>Allow Tutor Chat During Test</Typography>
                </Box>
                {buildForm.files && buildForm.files.length > 0 && (
                  <Typography variant="body2">Selected: {buildForm.files.map(f => f.name).join(', ')}</Typography>
                )}
                <Button type="submit" variant="contained" disabled={buildLoading}>Build Knowledge Graph</Button>
                {buildLoading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
                {buildError && <Alert severity="error">{typeof buildError === 'string' ? buildError : JSON.stringify(buildError)}</Alert>}
              </Box>
            </form>
          </Paper>
          {(buildLoading || buildJobStatus === 'running') && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Building Knowledge Graph...</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="body2">Step: {buildProgress?.current_step || 'Starting'}</Typography>
                <LinearProgress
                  variant={buildProgress?.total_steps && buildProgress?.current_step_number !== undefined ? 'determinate' : 'indeterminate'}
                  value={buildProgress?.total_steps ? Math.min(100, Math.round(((buildProgress.current_step_number || 0) / (buildProgress.total_steps || 1)) * 100)) : undefined}
                />
              </Box>
            </Paper>
          )}
          {buildJobStatus && buildJobStatus !== 'running' && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1">Build Status: {buildJobStatus}</Typography>
              {buildProgress?.error_message && (
                <Alert severity="error" sx={{ mt: 1 }}>{buildProgress.error_message}</Alert>
              )}
            </Paper>
          )}
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
                        {Array.isArray(questions) && questions.map((q, i) => {
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
                              <TableCell>
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {q.problem_statement || q.question || q.text || q.question_text || ''}
                                </ReactMarkdown>
                              </TableCell>
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
                  {/* Optimizer Buttons */}
                  <Box display="flex" justifyContent="center" gap={2} mt={2}>
                    <Button variant="contained" color="secondary" onClick={handleOptimize} disabled={optimizerLoading}>
                      {optimizerLoading ? 'Optimizing...' : 'Optimize Question Generator'}
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleOptimizeHints} disabled={optimizerStates.hints.loading}>
                      {optimizerStates.hints.loading ? 'Optimizing...' : 'Optimize Hint Generator'}
                    </Button>
                    <Button variant="contained" color="info" onClick={handleOptimizeScaffold} disabled={optimizerStates.scaffold.loading}>
                      {optimizerStates.scaffold.loading ? 'Optimizing...' : 'Optimize Scaffold Generator'}
                    </Button>
                  </Box>
                  {optimizerError && <Alert severity="error" sx={{ mt: 2 }}>{optimizerError}</Alert>}
                  {optimizerSuccess && <Alert severity="success" sx={{ mt: 2 }}>{optimizerSuccess}</Alert>}
                            {optimizerStates.hints.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.hints.error === 'string' ? optimizerStates.hints.error : JSON.stringify(optimizerStates.hints.error)}</Alert>}
          {optimizerStates.hints.success && <Alert severity="success" sx={{ mt: 2 }}>{typeof optimizerStates.hints.success === 'string' ? optimizerStates.hints.success : JSON.stringify(optimizerStates.hints.success)}</Alert>}
          {optimizerStates.scaffold.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.scaffold.error === 'string' ? optimizerStates.scaffold.error : JSON.stringify(optimizerStates.scaffold.error)}</Alert>}
          {optimizerStates.scaffold.success && <Alert severity="success" sx={{ mt: 2 }}>{typeof optimizerStates.scaffold.success === 'string' ? optimizerStates.scaffold.success : JSON.stringify(optimizerStates.scaffold.success)}</Alert>}
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
                  
                  {/* Edit Diagnostic Question Modal */}
                  <Dialog open={editStates.diagnostic.open} onClose={() => handleEditClose('diagnostic')} maxWidth="sm" fullWidth>
                    <DialogTitle>Edit Diagnostic Question</DialogTitle>
                    <DialogContent>
                      {editStates.diagnostic.data && (
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                          <TextField
                            label="Question Text"
                            value={editStates.diagnostic.data.question_text || ''}
                            onChange={e => handleEditChange('diagnostic', 'question_text', e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                          />
                          <FormControl fullWidth>
                            <InputLabel>Difficulty</InputLabel>
                            <Select
                              value={editStates.diagnostic.data.difficulty || ''}
                              label="Difficulty"
                              onChange={e => handleEditChange('diagnostic', 'difficulty', e.target.value)}
                            >
                              <MenuItem value="easy">Easy</MenuItem>
                              <MenuItem value="medium">Medium</MenuItem>
                              <MenuItem value="hard">Hard</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label="Options (one per line)"
                            value={Array.isArray(editStates.diagnostic.data.options) ? editStates.diagnostic.data.options.join('\n') : ''}
                            onChange={e => handleEditChange('diagnostic', 'options', e.target.value.split('\n').filter(opt => opt.trim()))}
                            fullWidth
                            multiline
                            rows={4}
                            helperText="Enter each option on a new line"
                          />
                        </Box>
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => handleEditClose('diagnostic')}>Cancel</Button>
                      <Button variant="contained" onClick={() => handleEditSave('diagnostic')}>Save</Button>
                    </DialogActions>
                  </Dialog>

                  {/* Edit Socratic Question Modal */}
                  <Dialog open={editStates.socratic.open} onClose={() => handleEditClose('socratic')} maxWidth="sm" fullWidth>
                    <DialogTitle>Edit Socratic Question</DialogTitle>
                    <DialogContent>
                      {editStates.socratic.data && (
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                          <TextField
                            label="Socratic Question"
                            value={editStates.socratic.data.socratic_question || ''}
                            onChange={e => handleEditChange('socratic', 'socratic_question', e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                          />
                          <TextField
                            label="Reasoning"
                            value={editStates.socratic.data.reasoning || ''}
                            onChange={e => handleEditChange('socratic', 'reasoning', e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                          />
                          <TextField
                            label="Options (one per line)"
                            value={Array.isArray(editStates.socratic.data.question_options) ? editStates.socratic.data.question_options.join('\n') : ''}
                            onChange={e => handleEditChange('socratic', 'question_options', e.target.value.split('\n').filter(opt => opt.trim()))}
                            fullWidth
                            multiline
                            rows={4}
                            helperText="Enter each option on a new line (for multiple choice)"
                          />
                        </Box>
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => handleEditClose('socratic')}>Cancel</Button>
                      <Button variant="contained" onClick={() => handleEditSave('socratic')}>Save</Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              )}
            </>
          )}
        </>
      )}
      {tab === 10 && (
        <>
          <ContentTemplates />
        </>
      )}
      {tab === 11 && (
        <Box mt={2}>
          <AgentPlayground
              wsBaseUrl={`${(window as any).WS_BASE || 'ws://localhost:8000/ws'}`}
              userId={undefined}
            token={localStorage.getItem('token') || ''}
          />
        </Box>
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
            {quickQuestions && quickQuestions.length > 0 && (
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleOptimizeQuick} 
                disabled={optimizerStates.quick.loading}
                startIcon={optimizerStates.quick.loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {optimizerStates.quick.loading ? 'Optimizing...' : 'Optimize Generator'}
              </Button>
            )}
          </Box>
          {quickQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof quickQuestionsError === 'string' ? quickQuestionsError : JSON.stringify(quickQuestionsError)}</Alert>}
          {optimizerStates.quick.error && <Alert severity="error" sx={{ mb: 2 }}>{typeof optimizerStates.quick.error === 'string' ? optimizerStates.quick.error : JSON.stringify(optimizerStates.quick.error)}</Alert>}
          {optimizerStates.quick.success && <Alert severity="success" sx={{ mb: 2 }}>{typeof optimizerStates.quick.success === 'string' ? optimizerStates.quick.success : JSON.stringify(optimizerStates.quick.success)}</Alert>}
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
                    <TableCell>Feedback</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(quickQuestions) && quickQuestions.map((q, i) => {
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
                        <TableCell>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q.problem_statement || q.question || q.text || q.question_text || ''}
                          </ReactMarkdown>
                        </TableCell>
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
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <ThumbUpAltOutlinedIcon 
                              onClick={() => handleThumb(i, 'up')}
                              sx={{ 
                                cursor: 'pointer', 
                                color: questionFeedback[i] === 'up' ? '#4caf50' : '#aaa',
                                fontSize: '1.2rem'
                              }}
                            />
                            <ThumbDownAltOutlinedIcon 
                              onClick={() => handleThumb(i, 'down')}
                              sx={{ 
                                cursor: 'pointer', 
                                color: questionFeedback[i] === 'down' ? '#f44336' : '#aaa',
                                fontSize: '1.2rem'
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Optimizer Button for Quick Questions */}
          {quickQuestions && quickQuestions.length > 0 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleOptimizeQuick} 
                disabled={optimizerStates.quick.loading}
              >
                {optimizerStates.quick.loading ? 'Optimizing...' : 'Optimize Quick Question Generator'}
              </Button>
            </Box>
          )}
          {optimizerStates.quick.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.quick.error === 'string' ? optimizerStates.quick.error : JSON.stringify(optimizerStates.quick.error)}</Alert>}
          {optimizerStates.quick.success && <Alert severity="success" sx={{ mt: 2 }}>{optimizerStates.quick.success}</Alert>}
          
          {/* Optimizer Button for Socratic Questions */}
          {socraticQuestions && socraticQuestions.length > 0 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleOptimizeSocratic} 
                disabled={optimizerStates.socratic.loading}
              >
                {optimizerStates.socratic.loading ? 'Optimizing...' : 'Optimize Socratic Generator'}
              </Button>
            </Box>
          )}
          {optimizerStates.socratic.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.socratic.error === 'string' ? optimizerStates.socratic.error : JSON.stringify(optimizerStates.socratic.error)}</Alert>}
          {optimizerStates.socratic.success && <Alert severity="success" sx={{ mt: 2 }}>{typeof optimizerStates.socratic.success === 'string' ? optimizerStates.socratic.success : JSON.stringify(optimizerStates.socratic.success)}</Alert>}
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
                    <TableCell>Feedback</TableCell>
                    <TableCell>Edit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(diagnosticQuestions) && diagnosticQuestions.map((q, i) => {
                    const questionData = q.diagnostic_question || q;
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {questionData.question_text || questionData.question || ''}
                          </ReactMarkdown>
                        </TableCell>
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
                                    {String.fromCharCode(65 + idx)}. <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No options</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <ThumbUpAltOutlinedIcon
                            fontSize="small"
                            sx={{ cursor: 'pointer', color: feedbackStates.diagnostic[i] === 'up' ? '#4caf50' : '#aaa' }}
                            onClick={() => handleFeedback('diagnostic', i, 'up')}
                          />
                          <ThumbDownAltOutlinedIcon
                            fontSize="small"
                            sx={{ cursor: 'pointer', color: feedbackStates.diagnostic[i] === 'down' ? '#f44336' : '#aaa', ml: 1 }}
                            onClick={() => handleFeedback('diagnostic', i, 'down')}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary" onClick={() => handleEditOpen('diagnostic', i, questionData)}>
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {/* Optimizer Button for Diagnostic Questions */}
          {diagnosticQuestions && diagnosticQuestions.length > 0 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleOptimizeDiagnostic} 
                disabled={optimizerStates.diagnostic.loading}
              >
                {optimizerStates.diagnostic.loading ? 'Optimizing...' : 'Optimize Diagnostic Generator'}
              </Button>
            </Box>
          )}
          {optimizerStates.diagnostic.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.diagnostic.error === 'string' ? optimizerStates.diagnostic.error : JSON.stringify(optimizerStates.diagnostic.error)}</Alert>}
          {optimizerStates.diagnostic.success && <Alert severity="success" sx={{ mt: 2 }}>{optimizerStates.diagnostic.success}</Alert>}
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
              {Array.isArray(lessons) && lessons.map((lesson, i) => (
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
          
          {/* Optimizer Button for Concept Lessons */}
          {lessons && lessons.length > 0 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleOptimizeLessons} 
                disabled={optimizerStates.lessons.loading}
              >
                {optimizerStates.lessons.loading ? 'Optimizing...' : 'Optimize Lesson Generator'}
              </Button>
            </Box>
          )}
          {optimizerStates.lessons.error && <Alert severity="error" sx={{ mt: 2 }}>{typeof optimizerStates.lessons.error === 'string' ? optimizerStates.lessons.error : JSON.stringify(optimizerStates.lessons.error)}</Alert>}
          {optimizerStates.lessons.success && <Alert severity="success" sx={{ mt: 2 }}>{optimizerStates.lessons.success}</Alert>}
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
                    <TableCell>Feedback</TableCell>
                    <TableCell>Edit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(socraticQuestions) && socraticQuestions.map((q, i) => (
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
                      <TableCell>
                        <ThumbUpAltOutlinedIcon
                          fontSize="small"
                          sx={{ cursor: 'pointer', color: feedbackStates.socratic[i] === 'up' ? '#4caf50' : '#aaa' }}
                          onClick={() => handleFeedback('socratic', i, 'up')}
                        />
                        <ThumbDownAltOutlinedIcon
                          fontSize="small"
                          sx={{ cursor: 'pointer', color: feedbackStates.socratic[i] === 'down' ? '#f44336' : '#aaa', ml: 1 }}
                          onClick={() => handleFeedback('socratic', i, 'down')}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => handleEditOpen('socratic', i, q)}>
                          <EditIcon />
                        </IconButton>
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
           <Typography variant="h6" gutterBottom>Generate Questions by Concepts</Typography>
           <Paper sx={{ p: 3, mb: 3 }}>
             <Box display="flex" flexDirection="column" gap={2}>
               <FormControl fullWidth>
                 <InputLabel id="concept-subject-select-label">Subject</InputLabel>
                 <Select
                   labelId="concept-subject-select-label"
                   value={conceptSubjects.find((s: any) => s.name === conceptSubject)?.id || ''}
                   onChange={(e) => handleConceptSubjectChange(e.target.value)}
                   label="Subject"
                 >
                   <MenuItem value="">
                     <em>Select a subject</em>
                   </MenuItem>
                   {conceptSubjects.map((subject: any) => (
                     <MenuItem key={subject.id} value={subject.id}>
                       {subject.name}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
               {conceptsLoading && (
                 <Box display="flex" alignItems="center" gap={1}>
                   <CircularProgress size={16} />
                   <Typography variant="body2" color="text.secondary">
                     Loading concepts and topics...
                   </Typography>
                 </Box>
               )}
               {conceptTopics.length > 0 && (
                 <Box>
                   <Typography variant="subtitle1" gutterBottom>
                     Topics ({conceptTopics.length})
                   </Typography>
                   <Box display="flex" flexWrap="wrap" gap={1}>
                     {conceptTopics.map((topic) => (
                       <Chip
                         key={topic.id}
                         label={topic.name}
                         color="primary"
                         variant="outlined"
                         size="small"
                       />
                     ))}
                   </Box>
                 </Box>
               )}
               {conceptConcepts.length > 0 && (
                 <Box>
                   <Typography variant="subtitle1" gutterBottom>
                     Concepts ({conceptConcepts.length}) - Select multiple concepts
                   </Typography>
                   <Box display="flex" flexDirection="column" gap={1} maxHeight={300} overflow="auto">
                     {conceptConcepts.map((concept) => (
                       <Box
                         key={concept.id}
                         sx={{
                           display: 'flex',
                           alignItems: 'center',
                           p: 1,
                           border: selectedConcepts.includes(concept.id) 
                             ? '2px solid #1976d2' 
                             : '1px solid #e0e0e0',
                           borderRadius: 1,
                           backgroundColor: selectedConcepts.includes(concept.id) 
                             ? '#e3f2fd' 
                             : 'white',
                           cursor: 'pointer',
                           '&:hover': {
                             backgroundColor: selectedConcepts.includes(concept.id) 
                               ? '#bbdefb' 
                               : '#f5f5f5'
                           }
                         }}
                         onClick={() => handleConceptSelection(concept.id)}
                       >
                         <Checkbox
                           checked={selectedConcepts.includes(concept.id)}
                           onChange={() => handleConceptSelection(concept.id)}
                           onClick={(e) => e.stopPropagation()}
                           size="small"
                         />
                         <Box sx={{ ml: 1, flex: 1 }}>
                           <Typography variant="body2" fontWeight="medium">
                             {concept.name}
                           </Typography>
                         </Box>
                       </Box>
                     ))}
                   </Box>
                   <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                     Selected: {selectedConcepts.length} concept(s)
                   </Typography>
                 </Box>
               )}
               <Button 
                 variant="contained" 
                 onClick={handleGenerateConceptQuestions} 
                 disabled={conceptQuestionsLoading || selectedConcepts.length === 0}
                 startIcon={conceptQuestionsLoading ? <CircularProgress size={16} color="inherit" /> : null}
               >
                 {conceptQuestionsLoading ? 'Generating Questions...' : `Generate Questions for ${selectedConcepts.length} Concept(s)`}
               </Button>
             </Box>
           </Paper>
           {conceptQuestionsError && <Alert severity="error" sx={{ mb: 2 }}>{typeof conceptQuestionsError === 'string' ? conceptQuestionsError : JSON.stringify(conceptQuestionsError)}</Alert>}
           {conceptQuestionsLoading && (
             <Box display="flex" justifyContent="center" alignItems="center" py={4}>
               <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                 <CircularProgress size={40} />
                 <Typography variant="body1" color="text.secondary">
                   Generating questions for selected concepts...
                 </Typography>
               </Box>
             </Box>
           )}
           {conceptQuestions && (
             <Box>
               {/* Diagnostic Questions */}
               {conceptQuestions.diagnostic_questions && conceptQuestions.diagnostic_questions.length > 0 && (
                 <Box mb={4}>
                   <Typography variant="h6" gutterBottom color="primary">
                     Diagnostic Questions ({conceptQuestions.diagnostic_questions.length})
                   </Typography>
                   <TableContainer component={Paper} sx={{ mb: 3 }}>
                     <Table>
                       <TableHead>
                         <TableRow>
                           <TableCell>#</TableCell>
                           <TableCell>Concept</TableCell>
                           <TableCell>Question</TableCell>
                           <TableCell>Difficulty</TableCell>
                           <TableCell>Options</TableCell>
                           <TableCell>Correct Answer</TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {conceptQuestions.diagnostic_questions.map((q: GeneratedDiagnosticQuestion, i: number) => (
                           <TableRow key={i}>
                             <TableCell>{i + 1}</TableCell>
                             <TableCell>{q.concept_name || 'N/A'}</TableCell>
                             <TableCell>
                               <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                 {q.question_text || ''}
                               </ReactMarkdown>
                             </TableCell>
                             <TableCell>
                               <Chip 
                                 label={q.difficulty || 'Unknown'} 
                                 color={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'error'} 
                                 size="small" 
                               />
                             </TableCell>
                             <TableCell>
                               {q.options && Array.isArray(q.options) ? (
                                 <Box display="flex" flexDirection="column" gap={0.5}>
                                   {q.options.map((opt: string, idx: number) => (
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
                               <Typography variant="body2" fontWeight="medium" color="success.main">
                                 {q.correct_answer || 'N/A'}
                               </Typography>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </Box>
               )}
               
               {/* Practice Problems */}
               {conceptQuestions.practice_problems && conceptQuestions.practice_problems.length > 0 && (
                 <Box>
                   <Typography variant="h6" gutterBottom color="secondary">
                     Practice Problems ({conceptQuestions.practice_problems.length})
                   </Typography>
                   <TableContainer component={Paper} sx={{ mb: 3 }}>
                     <Table>
                       <TableHead>
                         <TableRow>
                           <TableCell>#</TableCell>
                           <TableCell>Concept</TableCell>
                           <TableCell>Problem Statement</TableCell>
                           <TableCell>Difficulty</TableCell>
                           <TableCell>Max Point</TableCell>
                           <TableCell>Assessment Rubric</TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {conceptQuestions.practice_problems.map((p: GeneratedPracticeProblem, i: number) => (
                           <TableRow key={i}>
                             <TableCell>{i + 1}</TableCell>
                             <TableCell>{p.concept_name || 'N/A'}</TableCell>
                             <TableCell>
                               <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                 {p.problem_statement || ''}
                               </ReactMarkdown>
                             </TableCell>
                             <TableCell>
                               <Chip 
                                 label={p.difficulty_level || 'Unknown'} 
                                 color={p.difficulty_level === 'easy' ? 'success' : p.difficulty_level === 'medium' ? 'warning' : 'error'} 
                                 size="small" 
                               />
                             </TableCell>
                             <TableCell>{p.max_point || 'N/A'}</TableCell>
                             <TableCell>
                               {p.assessment_rubric ? (
                                 <Box display="flex" flexDirection="column" gap={1}>
                                   {Array.isArray(p.assessment_rubric) ? p.assessment_rubric.map((item: any, idx: number) => (
                                     <Box key={idx} sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1 }}>
                                       <Typography variant="body2" sx={{ fontWeight: 500 }}>{idx + 1}. {item.criterion || item}</Typography>
                                       {item.points && (
                                         <Typography variant="caption" color="primary">{item.points} pts</Typography>
                                       )}
                                     </Box>
                                   )) : (
                                     <Typography variant="body2">{p.assessment_rubric}</Typography>
                                   )}
                                 </Box>
                               ) : (
                                 <Typography variant="body2" color="text.secondary">No rubric</Typography>
                               )}
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </Box>
               )}
             </Box>
           )}
         </Box>
       )}
      {tab === 7 && (
        <Box>
          <Typography variant="h6" gutterBottom>My Subjects</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Search subjects by name"
                value={mySubjectsSearch}
                onChange={(e) => setMySubjectsSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchMySubjects();
                  }
                }}
                placeholder="e.g., IB, Math, Science..."
                helperText="Search is case-insensitive and matches partial names. Press Enter to search."
                fullWidth
                sx={{ mb: 2 }}
              />
              <Box display="flex" gap={2}>
                <Button 
                  variant="contained" 
                  onClick={handleSearchMySubjects}
                  disabled={mySubjectsLoading}
                >
                  {mySubjectsLoading ? 'Loading...' : 'Load My Subjects'}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleClearSearch}
                  disabled={mySubjectsLoading}
                >
                  Clear Search
                </Button>
              </Box>
            </Box>
          </Paper>
          {mySubjectsError && <Alert severity="error" sx={{ mb: 2 }}>{mySubjectsError}</Alert>}
          {mySubjects && mySubjects.length > 0 && (
            <>
              {mySubjectsSearch && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Found {mySubjects.length} subject(s) matching "{mySubjectsSearch}"
                </Alert>
              )}
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
                  {Array.isArray(mySubjects) && mySubjects.map((subject, i) => (
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
            </>
          )}
          {mySubjects && mySubjects.length === 0 && (
            <Alert severity="info">
              {mySubjectsSearch ? 
                `No subjects found matching "${mySubjectsSearch}". Try a different search term or clear the search to see all your subjects.` :
                'You haven\'t created any subjects yet. Use the "Build Knowledge Graph" tab to create your first subject.'
              }
            </Alert>
          )}
        </Box>
      )}
      {tab === 8 && (
        <Box>
          <Typography variant="h5" gutterBottom>Cross-Subject Relations Management</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Monitor and clean up cross-subject relations to ensure subject isolation. 
            This tool helps maintain data integrity by preventing concepts from different subjects from being related.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleCheckCrossSubjectRelations}
              disabled={crossSubjectRelationsLoading}
              sx={{ mr: 2 }}
            >
              {crossSubjectRelationsLoading ? <CircularProgress size={20} /> : 'Check Cross-Subject Relations'}
            </Button>
            
            <Button
              variant="outlined"
              color="warning"
              onClick={handleCleanupCrossSubjectRelations}
              disabled={cleanupLoading || !crossSubjectRelations}
            >
              {cleanupLoading ? <CircularProgress size={20} /> : 'Cleanup Cross-Subject Relations'}
            </Button>
          </Box>

          {crossSubjectRelationsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {crossSubjectRelationsError}
            </Alert>
          )}

          {cleanupError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cleanupError}
            </Alert>
          )}

          {cleanupResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Cleanup completed successfully! 
              Removed {cleanupResult.removed_prereq_count} PREREQUISITE relations and {cleanupResult.removed_relates_count} RELATES_TO relations.
            </Alert>
          )}

          {crossSubjectRelations && (
            <>
              <Typography variant="h6" gutterBottom>
                Cross-Subject Relations Found: {crossSubjectRelations.total_cross_subject_relations}
              </Typography>
              
              {crossSubjectRelations.cross_prereq_relations && crossSubjectRelations.cross_prereq_relations.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" color="warning.main" gutterBottom>
                    Cross-Subject PREREQUISITE Relations ({crossSubjectRelations.cross_prereq_relations.length})
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Source Concept</TableCell>
                          <TableCell>Source Subject</TableCell>
                          <TableCell>Target Concept</TableCell>
                          <TableCell>Target Subject</TableCell>
                          <TableCell>Relation Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {crossSubjectRelations.cross_prereq_relations.map((relation: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.source}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.source_subject} color="primary" size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.target}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.target_subject} color="secondary" size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.type} color="warning" size="small" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {crossSubjectRelations.cross_relates_relations && crossSubjectRelations.cross_relates_relations.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" color="warning.main" gutterBottom>
                    Cross-Subject RELATES_TO Relations ({crossSubjectRelations.cross_relates_relations.length})
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Source Concept</TableCell>
                          <TableCell>Source Subject</TableCell>
                          <TableCell>Target Concept</TableCell>
                          <TableCell>Target Subject</TableCell>
                          <TableCell>Relation Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {crossSubjectRelations.cross_relates_relations.map((relation: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.source}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.source_subject} color="primary" size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {relation.target}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.target_subject} color="secondary" size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip label={relation.type} color="warning" size="small" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {crossSubjectRelations.total_cross_subject_relations === 0 && (
                <Alert severity="success">
                  No cross-subject relations found! Your knowledge graph is properly isolated by subject.
                </Alert>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 9 && (
        <Box>
          <Typography variant="h5" gutterBottom>Background Question Generation</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Generate questions for all concepts in a subject as a background process. 
            This allows you to pregenerate 5 questions per concept across all difficulties without blocking the UI.
          </Typography>
          
          {/* Subject Selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Select Subject</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  label="Subject"
                  disabled={subjectsLoading}
                >
                  {availableSubjects.length === 0 ? (
                    <MenuItem disabled>
                      {subjectsLoading ? 'Loading subjects...' : 'No subjects available'}
                    </MenuItem>
                  ) : (
                    availableSubjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={handleFetchAvailableSubjects}
                disabled={subjectsLoading}
              >
                {subjectsLoading ? <CircularProgress size={20} /> : 'Refresh Subjects'}
              </Button>
            </Box>
            
            {availableSubjects.length === 0 && !subjectsLoading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No subjects found. Please create a subject first in the "Build Knowledge Graph" tab.
              </Alert>
            )}
            
            <Button
              variant="contained"
              onClick={handleStartBackgroundJob}
              disabled={!selectedSubject}
              sx={{ mr: 2 }}
            >
              Start Background Generation
            </Button>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This will generate 5 questions per concept (diagnostic + practice) for all difficulties.
            </Typography>
          </Paper>

          {/* Job Management */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Background Jobs</Typography>
              <Button
                variant="outlined"
                onClick={handleFetchBackgroundJobs}
                disabled={backgroundJobsLoading}
              >
                {backgroundJobsLoading ? <CircularProgress size={20} /> : 'Refresh Jobs'}
              </Button>
            </Box>
            
            {backgroundJobsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {backgroundJobsError}
              </Alert>
            )}
            
            {backgroundJobs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No background jobs found. Start a new job to see it here.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job ID</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backgroundJobs.map((job) => (
                      <TableRow key={job.job_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {job.job_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={job.subject_name || 'N/A'} color="primary" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status} 
                            color={
                              job.status === 'completed' ? 'success' : 
                              job.status === 'running' ? 'warning' : 
                              job.status === 'cancelled' ? 'error' : 'default'
                            } 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          {job.status === 'running' && job.progress ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {job.progress.completed_concepts}/{job.progress.total_concepts}
                                </Typography>
                                <CircularProgress size={16} />
                              </Box>
                              {job.progress.current_concept && (
                                <Typography variant="caption" color="text.secondary">
                                  {job.progress.current_concept}
                                </Typography>
                              )}
                              {job.progress.current_difficulty && (
                                <Typography variant="caption" color="text.secondary">
                                  Difficulty: {job.progress.current_difficulty}
                                </Typography>
                              )}
                              {job.progress.failed_questions > 0 && (
                                <Typography variant="caption" color="error">
                                  Failed: {job.progress.failed_questions}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              {job.status === 'completed' ? '100%' : '0%'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {job.start_time ? new Date(job.start_time).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleCheckJobStatus(job.job_id)}
                              disabled={jobStatusLoading}
                            >
                              Status
                            </Button>
                            {job.status === 'running' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => handleCancelJob(job.job_id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Current Job Status */}
          {currentJobStatus && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Current Job Status</Typography>
              {jobStatusLoading ? (
                <Box display="flex" justifyContent="center">
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Job ID: {currentJobStatus.job_id}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Status: <Chip 
                      label={currentJobStatus.status} 
                      color={
                        currentJobStatus.status === 'completed' ? 'success' : 
                        currentJobStatus.status === 'running' ? 'warning' : 
                        currentJobStatus.status === 'cancelled' ? 'error' : 'default'
                      } 
                      size="small" 
                    />
                  </Typography>
                  {currentJobStatus.start_time && (
                    <Typography variant="body2" gutterBottom>
                      Started: {new Date(currentJobStatus.start_time).toLocaleString()}
                    </Typography>
                  )}
                  {currentJobStatus.end_time && (
                    <Typography variant="body2" gutterBottom>
                      Completed: {new Date(currentJobStatus.end_time).toLocaleString()}
                    </Typography>
                  )}
                  
                  {currentJobStatus.progress && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Progress Details:</Typography>
                      <Typography variant="body2">
                        • Total Concepts: {currentJobStatus.progress.total_concepts}
                      </Typography>
                      <Typography variant="body2">
                        • Completed Concepts: {currentJobStatus.progress.completed_concepts}
                      </Typography>
                      <Typography variant="body2">
                        • Failed Concepts: {currentJobStatus.progress.failed_concepts || 0}
                      </Typography>
                      <Typography variant="body2">
                        • Questions Generated: {currentJobStatus.progress.questions_generated || 0}
                      </Typography>
                      <Typography variant="body2">
                        • Diagnostic Questions: {currentJobStatus.progress.diagnostic_questions || 0}
                      </Typography>
                      <Typography variant="body2">
                        • Practice Problems: {currentJobStatus.progress.practice_problems || 0}
                      </Typography>
                      <Typography variant="body2">
                        • Failed Questions: {currentJobStatus.progress.failed_questions || 0}
                      </Typography>
                      {currentJobStatus.progress.current_difficulty && (
                        <Typography variant="body2">
                          • Current Difficulty: {currentJobStatus.progress.current_difficulty}
                        </Typography>
                      )}
                      
                      {currentJobStatus.progress.current_concept && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="primary">
                            Currently Processing: {currentJobStatus.progress.current_concept}
                          </Typography>
                        </Box>
                      )}
                      
                      {/* Timing Statistics */}
                      {currentJobStatus.timing_stats && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Timing Statistics:</Typography>
                          {currentJobStatus.timing_stats.total_job_time && (
                            <Typography variant="body2">
                              • Total Job Time: {(currentJobStatus.timing_stats.total_job_time / 60).toFixed(2)} minutes
                            </Typography>
                          )}
                          {currentJobStatus.timing_stats.difficulty_times && (
                            <Box sx={{ ml: 2 }}>
                              <Typography variant="body2" fontWeight="bold">Average Time per Difficulty:</Typography>
                              {Object.entries(currentJobStatus.timing_stats.difficulty_times).map(([difficulty, stats]: [string, any]) => (
                                <Typography key={difficulty} variant="body2" sx={{ ml: 1 }}>
                                  • {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}: {stats.avg_time ? stats.avg_time.toFixed(2) : 0} seconds ({stats.count || 0} concepts)
                                </Typography>
                              ))}
                            </Box>
                          )}
                          {currentJobStatus.timing_stats.concept_times && Object.keys(currentJobStatus.timing_stats.concept_times).length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" fontWeight="bold">Recent Concepts:</Typography>
                              {Object.entries(currentJobStatus.timing_stats.concept_times).slice(-3).map(([conceptName, stats]: [string, any]) => (
                                <Typography key={conceptName} variant="body2" sx={{ ml: 1 }}>
                                  • {conceptName}: {stats.total_time ? stats.total_time.toFixed(2) : 0}s ({stats.diagnostic_questions || 0} diagnostic, {stats.practice_problems || 0} practice, {stats.failed_questions || 0} failed)
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {currentJobStatus.error_message && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Error: {currentJobStatus.error_message}
                    </Alert>
                  )}
                </Box>
              )}
            </Paper>
          )}

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Background Generation Features:</strong>
              <br />• Generates 5 questions per concept (diagnostic + practice)
              <br />• All difficulty levels (Easy, Medium, Hard)
              <br />• Progress tracking with real-time updates
              <br />• Cancellation preserves completed work
              <br />• Non-blocking - UI remains responsive
            </Typography>
          </Alert>

          {/* Optimizer Jobs Section */}
          <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Optimizer Jobs</Typography>
              <Button
                variant="outlined"
                onClick={handleFetchOptimizerJobs}
                disabled={optimizerJobsLoading}
              >
                {optimizerJobsLoading ? <CircularProgress size={20} /> : 'Refresh Optimizer Jobs'}
              </Button>
            </Box>
            
            {optimizerJobsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {optimizerJobsError}
              </Alert>
            )}
            
            {optimizerJobs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No optimizer jobs found. Start an optimizer to see it here.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job ID</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {optimizerJobs.map((job) => (
                      <TableRow key={job.job_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {job.job_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={job.subject_name || 'N/A'} color="primary" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.optimizer_type?.replace('_', ' ') || 'N/A'} 
                            color="secondary" 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status} 
                            color={
                              job.status === 'completed' ? 'success' : 
                              job.status === 'running' ? 'warning' : 
                              job.status === 'cancelled' ? 'error' : 'default'
                            } 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          {job.status === 'running' && job.progress ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  Step {job.progress.current_step_number}/{job.progress.total_steps}
                                </Typography>
                                <CircularProgress size={16} />
                              </Box>
                              {job.progress.current_step && (
                                <Typography variant="caption" color="text.secondary">
                                  {job.progress.current_step}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              {job.status === 'completed' ? '100%' : '0%'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {job.start_time ? new Date(job.start_time).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {job.status === 'running' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => handleCancelOptimizerJob(job.job_id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}
      {/* System Prompt Editor Modal */}
      <SystemPromptEditor
        open={systemPromptEditorOpen}
        onClose={handleCloseSystemPromptEditor}
        currentTab={tab}
        tabData={getCurrentTabData()}
        onDataUpdate={handleSystemPromptDataUpdate}
      />
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
