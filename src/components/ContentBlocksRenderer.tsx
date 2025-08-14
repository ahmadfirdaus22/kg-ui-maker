import React, { useState } from 'react';
import { Box, Typography, Paper, Button, TextField, Divider } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export type ContentBlock = {
  type: string;
  weight: 'light' | 'heavy';
  level?: number;
  text?: string;
  content?: string;
  toolName?: string;
  config?: any;
  meta?: any;
};

interface Props {
  blocks: ContentBlock[];
  onInvokeSocratic?: (config: { conceptId?: string; conceptName?: string; stepOrder?: number; exampleQuestion: string }) => void;
}

const HeadingBlock: React.FC<{ level?: number; text?: string }> = ({ level = 2, text = '' }) => {
  const variant = level === 1 ? 'h4' : level === 2 ? 'h5' : 'h6';
  return (
    <Typography variant={variant} gutterBottom>{text}</Typography>
  );
};

const TextBlock: React.FC<{ content?: string }> = ({ content = '' }) => {
  return (
    <Box sx={{ whiteSpace: 'pre-wrap' }}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </Box>
  );
};

const SocraticTool: React.FC<{ config?: any; onInvoke?: (cfg: any) => void }>
  = ({ config, onInvoke }) => {
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState('Berikan contoh penerapan konsep ini.');
  const conceptId = config?.conceptId || config?.conceptID;
  const conceptName = config?.conceptName || '';
  const stepOrder = config?.stepOrder;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Socratic Questions Tool {conceptName ? `— ${conceptName}` : ''}
      </Typography>
      {!open ? (
        <Button variant="contained" onClick={() => setOpen(true)}>Ask a Socratic Question</Button>
      ) : (
        <Box display="flex" gap={1} alignItems="center">
          <TextField
            size="small"
            fullWidth
            label="Example question"
            value={example}
            onChange={(e) => setExample(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => onInvoke && onInvoke({ conceptId, conceptName, stepOrder, exampleQuestion: example })}
          >
            Generate
          </Button>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </Box>
      )}
    </Paper>
  );
};

const OnlineJudgeTool: React.FC<{ config?: any }>
  = ({ config }) => {
  const [code, setCode] = useState(config?.initialCode || '');
  const language = config?.language || 'python';
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Online Judge ({language})</Typography>
      <TextField
        multiline
        minRows={6}
        fullWidth
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`// Write ${language} code here`}
      />
      <Box mt={1} display="flex" gap={1}>
        <Button variant="contained" disabled>Run (placeholder)</Button>
        <Button disabled>Reset</Button>
      </Box>
    </Paper>
  );
};

// Lightweight Desmos embed using the official API (script loaded on demand)
const DesmosGraphTool: React.FC<{ config?: any }>
  = ({ config }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  React.useEffect(() => {
    const ensureScript = () => new Promise<void>((resolve, reject) => {
      if ((window as any).Desmos) return resolve();
      const existing = document.querySelector('script[data-desmos]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://www.desmos.com/api/v1.7/calculator.js?apiKey=dcb';
      script.async = true;
      script.setAttribute('data-desmos', '1');
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });

    let calculator: any;
    let cancelled = false;
    ensureScript().then(() => {
      if (cancelled) return;
      const Desmos = (window as any).Desmos;
      if (containerRef.current && Desmos) {
        calculator = Desmos.GraphingCalculator(containerRef.current, { expressions: true });
        // Set expressions from config
        const exprs: string[] = Array.isArray(config?.expressions) ? config.expressions : (config?.expression ? [config.expression] : []);
        exprs.forEach((e: string, i: number) => {
          calculator.setExpression({ id: `expr_${i}`, latex: e });
        });
        // Set bounds if provided
        if (config?.bounds) {
          const b = config.bounds;
          calculator.setMathBounds({ left: b.left ?? -10, right: b.right ?? 10, bottom: b.bottom ?? -10, top: b.top ?? 10 });
        }
        setReady(true);
      }
    }).catch(() => setReady(false));

    return () => {
      cancelled = true;
      try {
        if (calculator && calculator.destroy) calculator.destroy();
      } catch {}
    };
  }, [config]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Desmos Graph</Typography>
      <Box ref={containerRef} sx={{ width: '100%', height: 380, borderRadius: 1, border: '1px solid #e0e0e0' }} />
      {!ready && <Typography variant="caption" color="text.secondary">Loading Desmos…</Typography>}
    </Paper>
  );
};

const ToolBlock: React.FC<{ toolName?: string; config?: any; onInvokeSocratic?: (cfg: any) => void }>
  = ({ toolName, config, onInvokeSocratic }) => {
  switch ((toolName || '').toLowerCase()) {
    case 'socratic-questions':
      return <SocraticTool config={config} onInvoke={onInvokeSocratic} />;
    case 'online-judge':
      return <OnlineJudgeTool config={config} />;
    case 'desmos-graph':
      return <DesmosGraphTool config={config} />;
    default:
      return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2">Unsupported tool</Typography>
          <Divider sx={{ my: 1 }} />
          <pre style={{ margin: 0 }}>{JSON.stringify({ toolName, config }, null, 2)}</pre>
        </Paper>
      );
  }
};

const ContentBlocksRenderer: React.FC<Props> = ({ blocks, onInvokeSocratic }) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <Box>
      {blocks.map((b, i) => {
        if (b.weight === 'light') {
          if (b.type === 'heading') return <HeadingBlock key={i} level={b.level} text={b.text} />;
          return <TextBlock key={i} content={b.content} />;
        }
        return <ToolBlock key={i} toolName={b.toolName} config={b.config} onInvokeSocratic={onInvokeSocratic} />;
      })}
    </Box>
  );
};

export default ContentBlocksRenderer;


