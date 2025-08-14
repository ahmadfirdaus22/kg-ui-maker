import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import api from '../utils/axios';

type ToolName = 'text' | 'online-judge' | 'diagram' | 'scratchpad';
type BlockSchemaItem = { type: 'text' | 'tool'; required: boolean; description?: string | null; toolName?: ToolName | null };

type ContentTemplate = {
  id: string;
  name: string;
  description?: string | null;
  allowed_tools: ToolName[];
  evaluation_method: ToolName;
  block_schema: BlockSchemaItem[];
};

const ALL_TOOLS: ToolName[] = ['text', 'online-judge', 'diagram', 'scratchpad'];

function TemplateForm({
  open,
  initial,
  onClose,
  onSubmit
}: {
  open: boolean;
  initial?: Partial<ContentTemplate>;
  onClose: () => void;
  onSubmit: (payload: Omit<ContentTemplate, 'id'>) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [allowedTools, setAllowedTools] = useState<ToolName[]>(
    (initial?.allowed_tools as ToolName[]) || []
  );
  const [evaluationMethod, setEvaluationMethod] = useState<ToolName | ''>(
    (initial?.evaluation_method as ToolName) || ''
  );
  const [blockSchema, setBlockSchema] = useState<BlockSchemaItem[]>(
    initial?.block_schema || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure evaluation method remains within allowed tools
    if (evaluationMethod && !allowedTools.includes(evaluationMethod)) {
      setEvaluationMethod('');
    }
  }, [allowedTools]);

  const canSubmit = useMemo(() => {
    return (
      !!name.trim() &&
      allowedTools.length > 0 &&
      !!evaluationMethod &&
      blockSchema.every((b) => (b.type === 'tool' ? !!b.toolName : true))
    );
  }, [name, allowedTools, evaluationMethod, blockSchema]);

  const handleAddBlock = (type: 'text' | 'tool') => {
    setBlockSchema((prev) => [
      ...prev,
      {
        type,
        required: false,
        description: '',
        toolName: type === 'tool' ? 'text' : undefined
      }
    ]);
  };

  const handleRemoveBlock = (idx: number) => {
    setBlockSchema((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: name.trim(),
        description: description || null,
        allowed_tools: allowedTools,
        evaluation_method: evaluationMethod as ToolName,
        block_schema: blockSchema.map((b) => ({
          type: b.type,
          required: !!b.required,
          description: b.description || undefined,
          toolName: b.type === 'tool' ? (b.toolName as ToolName) : undefined
        }))
      } as Omit<ContentTemplate, 'id'>;
      await onSubmit(payload);
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || e.message || 'Failed to save template');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initial?.id ? 'Edit Template' : 'Create Template'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Description" value={description || ''} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} />
          <FormControl>
            <InputLabel id="allowed-tools-label">Allowed Tools</InputLabel>
            <Select
              labelId="allowed-tools-label"
              label="Allowed Tools"
              multiple
              value={allowedTools as any}
              onChange={(e) => setAllowedTools(e.target.value as ToolName[])}
            >
              {ALL_TOOLS.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel id="evaluation-method-label">Evaluation Method</InputLabel>
            <Select
              labelId="evaluation-method-label"
              label="Evaluation Method"
              value={evaluationMethod as any}
              onChange={(e) => setEvaluationMethod(e.target.value as ToolName)}
            >
              {allowedTools.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Block Schema</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddBlock('text')}>Add Text</Button>
                <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddBlock('tool')}>Add Tool</Button>
              </Stack>
            </Stack>
            <Stack spacing={1}>
              {blockSchema.map((b, i) => (
                <Paper key={i} sx={{ p: 1 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel id={`type-${i}`}>Type</InputLabel>
                      <Select
                        labelId={`type-${i}`}
                        label="Type"
                        value={b.type}
                        onChange={(e) => setBlockSchema(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as 'text' | 'tool', toolName: e.target.value === 'tool' ? (x.toolName || 'text') : undefined } : x))}
                      >
                        <MenuItem value="text">text</MenuItem>
                        <MenuItem value="tool">tool</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel id={`required-${i}`}>Required</InputLabel>
                      <Select
                        labelId={`required-${i}`}
                        label="Required"
                        value={b.required ? 'yes' : 'no'}
                        onChange={(e) => setBlockSchema(prev => prev.map((x, j) => j === i ? { ...x, required: e.target.value === 'yes' } : x))}
                      >
                        <MenuItem value="yes">yes</MenuItem>
                        <MenuItem value="no">no</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Description"
                      fullWidth
                      value={b.description || ''}
                      onChange={(e) => setBlockSchema(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    />
                    {b.type === 'tool' && (
                      <FormControl sx={{ minWidth: 160 }}>
                        <InputLabel id={`tool-${i}`}>Tool Name</InputLabel>
                        <Select
                          labelId={`tool-${i}`}
                          label="Tool Name"
                          value={(b.toolName || 'text') as any}
                          onChange={(e) => setBlockSchema(prev => prev.map((x, j) => j === i ? { ...x, toolName: e.target.value as ToolName } : x))}
                        >
                          {ALL_TOOLS.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <IconButton color="error" onClick={() => handleRemoveBlock(i)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
              {blockSchema.length === 0 && (
                <Typography variant="body2" color="text.secondary">No blocks yet. Add text/tool blocks above.</Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ContentTemplates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<ContentTemplate | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/templates?page=${page}&limit=${limit}`);
      setTemplates(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || e.message || 'Failed to load templates');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [page, limit]);

  const handleCreate = async (payload: Omit<ContentTemplate, 'id'>) => {
    await api.post('/templates', payload);
    await fetchTemplates();
  };

  const handleUpdate = async (id: string, payload: Omit<ContentTemplate, 'id'>) => {
    await api.put(`/templates/${id}`, payload);
    await fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    await fetchTemplates();
  };

  // Generate from template
  const [generateOpen, setGenerateOpen] = useState<{ id: string; name: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genBlocks, setGenBlocks] = useState<any[] | null>(null);

  const handleGenerate = async () => {
    if (!generateOpen) return;
    setGenLoading(true);
    setGenError(null);
    setGenBlocks(null);
    try {
      const res = await api.post(`/templates/${generateOpen.id}/generate`, { prompt });
      const blocks = res.data?.contentBlocks;
      setGenBlocks(Array.isArray(blocks) ? blocks : null);
      if (!Array.isArray(blocks)) {
        setGenError('Generation returned unexpected result');
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || e.message || 'Failed to generate');
      setGenError(msg);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Content Templates</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Template</Button>
      </Stack>
      {loading && <Box display="flex" justifyContent="center" my={3}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Allowed Tools</TableCell>
                <TableCell>Evaluation</TableCell>
                <TableCell>Blocks</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {t.allowed_tools.map((tool) => <Chip key={tool} label={tool} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                    </Stack>
                  </TableCell>
                  <TableCell><Chip label={t.evaluation_method} size="small" /></TableCell>
                  <TableCell>{t.block_schema?.length || 0}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditOpen(t)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => { setGenerateOpen({ id: t.id, name: t.name }); setPrompt(''); setGenBlocks(null); setGenError(null); }}>
                      <PlayArrowIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">No templates found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
            <Typography variant="caption">Total: {total}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Typography variant="caption">Page {page}</Typography>
              <Button size="small" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </Stack>
          </Stack>
        </TableContainer>
      )}

      {/* Create dialog */}
      <TemplateForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit dialog */}
      {editOpen && (
        <TemplateForm
          open={!!editOpen}
          initial={editOpen}
          onClose={() => setEditOpen(null)}
          onSubmit={(payload) => handleUpdate(editOpen.id, payload)}
        />
      )}

      {/* Generate dialog */}
      <Dialog open={!!generateOpen} onClose={() => setGenerateOpen(null)} fullWidth maxWidth="md">
        <DialogTitle>Generate from Template{generateOpen ? `: ${generateOpen.name}` : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {genError && <Alert severity="error">{genError}</Alert>}
            <TextField
              label="Prompt"
              placeholder="e.g., Create an intro and one coding exercise about quadratic equations aligning to curriculum X"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            {genLoading && <Box display="flex" justifyContent="center"><CircularProgress /></Box>}
            {genBlocks && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Generated contentBlocks</Typography>
                <Paper sx={{ p: 2, maxHeight: 360, overflow: 'auto' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(genBlocks, null, 2)}</pre>
                </Paper>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateOpen(null)}>Close</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={!prompt.trim() || genLoading}>Generate</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}


