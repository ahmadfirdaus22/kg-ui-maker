import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Divider, Tabs, Tab, Alert, Chip } from '@mui/material';
import ContentBlocksRenderer, { ContentBlock } from './ContentBlocksRenderer';
import api from '../utils/axios';

type IncomingEvent = {
  eventType: string;
  payload?: any;
  data?: any;
};

interface Props {
  wsBaseUrl: string; // e.g., ws://localhost:8000/api/v1/ws
  userId?: string; // optional; will fetch from /users/me if not provided
  token: string;
}

const AgentPlayground: React.FC<Props> = ({ wsBaseUrl, userId, token }) => {
  const [tab, setTab] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<IncomingEvent[]>([]);
  const [lightBlocks, setLightBlocks] = useState<ContentBlock[]>([]);
  const [heavyBlocks, setHeavyBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [realUserId, setRealUserId] = useState<string | null>(null);

  // Simple inputs to trigger Concept v2 and Practice v2
  const [conceptIds, setConceptIds] = useState(''); // comma-separated UUIDs
  const [topicId, setTopicId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState('8');
  const [learningSessionId, setLearningSessionId] = useState('');

  const [practiceConceptId, setPracticeConceptId] = useState('');
  const [practiceSessionId, setPracticeSessionId] = useState('');
  const [practiceDifficulty, setPracticeDifficulty] = useState('easy');

  // Fetch the real user id if not provided
  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const resp = await api.get('/users/me');
        if (!cancelled) {
          const id = resp?.data?.id || resp?.data?.user_id || resp?.data?.uid;
          if (id) setRealUserId(String(id));
          else setError('Unable to resolve user id from /users/me');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.detail || e?.message || 'Failed to fetch /users/me');
      }
    };
    if (!userId) fetchUser();
    else setRealUserId(userId);
    return () => { cancelled = true; };
  }, [userId]);

  const effectiveUserId = realUserId || '';

  const wsUrl = useMemo(() => {
    if (!effectiveUserId || !token) return '';
    const url = `${wsBaseUrl}/${encodeURIComponent(effectiveUserId)}?token=${encodeURIComponent(token)}`;
    return url;
  }, [wsBaseUrl, effectiveUserId, token]);

  const connect = useCallback(() => {
    try {
      if (!wsUrl) return;
      // Log connect attempt
      try { console.log('[WS] connecting to', wsUrl); } catch {}
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        try { console.log('[WS] open'); } catch {}
        setConnected(true);
      };
      ws.onclose = (evt) => {
        try { console.log('[WS] close', evt); } catch {}
        setConnected(false);
      };
      ws.onerror = (evt) => {
        try { console.error('[WS] error', evt); } catch {}
        setError('WebSocket error');
      };
      ws.onmessage = (evt) => {
        try {
          try { console.log('[WS] recv raw', evt.data); } catch {}
          const msg = JSON.parse(evt.data);
          try { console.log('[WS] recv parsed', msg); } catch {}
          setMessages((prev) => [...prev, msg]);
          const et = msg?.eventType;
          if (et === 'discovery.render_concept_v2' && msg.data?.contentBlocks) {
            setLightBlocks((prev) => [...prev, ...(msg.data.contentBlocks as ContentBlock[])]);
          } else if (et === 'discovery.render_concept_tools' && msg.data?.contentBlocks) {
            setHeavyBlocks((prev) => [...prev, ...(msg.data.contentBlocks as ContentBlock[])]);
          } else if (et === 'practice.render_problem_v2' && msg.payload?.data?.contentBlocks) {
            setLightBlocks((prev) => [...prev, ...(msg.payload.data.contentBlocks as ContentBlock[])]);
          } else if (et === 'practice.render_tools' && msg.payload?.contentBlocks) {
            setHeavyBlocks((prev) => [...prev, ...(msg.payload.contentBlocks as ContentBlock[])]);
          } else if (et === 'content.generated_from_template' && msg.data?.contentBlocks) {
            setLightBlocks((prev) => [...prev, ...(msg.data.contentBlocks as ContentBlock[])]);
          } else if ((et === 'stream.token' || et === 'stream.start' || et === 'stream.end') && msg.payload?.token) {
            // Optionally append streaming text as a light text block
            setLightBlocks((prev) => [...prev, { type: 'text', weight: 'light', content: msg.payload.token }]);
          }
        } catch (e) {
          // ignore parse errors
        }
      };
    } catch (e: any) {
      setError(e?.message || 'Failed to connect');
    }
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
  }, []);

  // Do not auto-connect; let user click the Connect button.
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const sendEvent = (event: any) => {
    try { console.log('[WS] send', event); } catch {}
    wsRef.current?.send(JSON.stringify(event));
  };

  // Fire Concept V2 event
  const triggerConceptV2 = () => {
    setLightBlocks([]); setHeavyBlocks([]);
    const ids = conceptIds.split(',').map(s => s.trim()).filter(Boolean);
    if (!effectiveUserId) return;
    sendEvent({
      eventType: 'concept.generate_multiple_lessons_v2',
      payload: {
        concept_ids: ids,
        topic_id: topicId || null,
        subject_id: subjectId || null,
        grade: grade || '8',
        learning_session_id: learningSessionId || null
      }
    });
  };

  // Fire Practice V2 event
  const triggerPracticeV2 = () => {
    setLightBlocks([]); setHeavyBlocks([]);
    if (!effectiveUserId) return;
    sendEvent({
      eventType: 'practice.render_problem_v2',
      payload: {
        session_id: practiceSessionId || 'sess-ui',
        user_id: effectiveUserId,
        concept_id: practiceConceptId,
        difficulty: practiceDifficulty
      }
    });
  };

  // Optional: Invoke socratic from heavy tool block
  const handleInvokeSocratic = (cfg: { conceptId?: string; conceptName?: string; stepOrder?: number; exampleQuestion: string }) => {
    if (!effectiveUserId) return;
    sendEvent({
      eventType: 'concept.render_socratic_question',
      payload: {
        concept_id: cfg.conceptId,
        example_question: cfg.exampleQuestion,
        concept_name: cfg.conceptName,
        question_type: 'multiple_choice'
      }
    });
  };

  // Manual test: push a Desmos graph heavy block via backend broadcast API
  const sendDesmosTest = async () => {
    if (!effectiveUserId) return;
    try {
      const payload = {
        user_id: effectiveUserId,
        event_type: 'practice.render_tools',
        message: {
          problemId: 'test-desmos',
          contentBlocks: [
            {
              type: 'tool',
              weight: 'heavy',
              toolName: 'desmos-graph',
              config: {
                expression: 'y=x^2',
                bounds: { left: -10, right: 10, bottom: -10, top: 10 }
              }
            }
          ]
        }
      };
      console.log('[WS] send desmos via HTTP', payload);
      await api.post('/ws/send-message', payload);
    } catch (e) {
      console.error('Failed to send desmos test', e);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="h6">Agent Playground</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label={connected ? 'Connected' : 'Disconnected'} color={connected ? 'success' : 'default'} size="small" />
          <Button
            size="small"
            variant="contained"
            onClick={connect}
            disabled={connected || !wsUrl || !effectiveUserId || !token}
          >
            Connect
          </Button>
          <Button
            size="small"
            onClick={disconnect}
            disabled={!connected}
          >
            Disconnect
          </Button>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {!effectiveUserId && (
        <Alert severity="info" sx={{ mt: 1 }}>Resolving user id…</Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2 }}>
        <Tab label="Concept v2" />
        <Tab label="Practice v2" />
        <Tab label="Output" />
      </Tabs>

      {tab === 0 && (
        <Box mt={2} display="grid" gap={1} gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}>
          <TextField label="Concept IDs (comma-separated UUIDs)" value={conceptIds} onChange={(e) => setConceptIds(e.target.value)} fullWidth />
          <TextField label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} fullWidth />
          <TextField label="Topic ID" value={topicId} onChange={(e) => setTopicId(e.target.value)} fullWidth />
          <TextField label="Subject ID" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} fullWidth />
          <TextField label="Learning Session ID" value={learningSessionId} onChange={(e) => setLearningSessionId(e.target.value)} fullWidth />
          <Box>
            <Button variant="contained" onClick={triggerConceptV2}>Generate Lessons v2</Button>
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box mt={2} display="grid" gap={1} gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}>
          <TextField label="Practice Concept ID" value={practiceConceptId} onChange={(e) => setPracticeConceptId(e.target.value)} fullWidth />
          <TextField label="Practice Session ID" value={practiceSessionId} onChange={(e) => setPracticeSessionId(e.target.value)} fullWidth />
          <TextField label="Difficulty" value={practiceDifficulty} onChange={(e) => setPracticeDifficulty(e.target.value)} fullWidth />
          <Box>
            <Button variant="contained" onClick={triggerPracticeV2}>Render Practice v2</Button>
          </Box>
        </Box>
      )}

      {tab === 2 && (
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>Light Content</Typography>
          <ContentBlocksRenderer blocks={lightBlocks} onInvokeSocratic={handleInvokeSocratic} />
          <Divider sx={{ my: 2 }} />
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" gutterBottom>Heavy Tools</Typography>
            <Button size="small" variant="outlined" onClick={sendDesmosTest} disabled={!effectiveUserId}>
              Send Desmos Test
            </Button>
          </Box>
          <ContentBlocksRenderer blocks={heavyBlocks} onInvokeSocratic={handleInvokeSocratic} />
        </Box>
      )}
    </Paper>
  );
};

export default AgentPlayground;


