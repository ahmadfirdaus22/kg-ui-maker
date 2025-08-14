import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import api from '../utils/axios';

type FormulaRange = { min: number; max: number; level: string };

interface ConceptFlat {
  id?: string;
  name: string;
  description?: string;
  skills?: string[];
  difficulty?: string;
  sequence?: number;
  threshold_mastery_score?: number;
  uuid?: string;
  topic_name?: string;
  topic_uuid?: string;
  subject_name?: string;
  subject_formula_evaluation?: FormulaRange[];
  attributes?: Record<string, any>;
  prerequisite_to?: string[];
  relates_to?: string[];
  part_of?: string[];
}

export default function ConceptSlideshow({ subject }: { subject: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<ConceptFlat[]>([]);
  const [idx, setIdx] = useState(0);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | ''>('');

  const current = concepts[idx] as ConceptFlat | undefined;

  const activeFormula = useMemo<FormulaRange[] | undefined>(() => {
    if (!current) return undefined;
    const preferred = current.attributes?.preferred_formula_evaluation as FormulaRange[] | undefined;
    return (preferred && preferred.length > 0) ? preferred : current.subject_formula_evaluation;
  }, [current]);

  const [form, setForm] = useState<{ description?: string; skillsCsv?: string; difficulty?: string; sequence?: number; threshold_mastery_score?: number; preferred_formula_evaluation?: FormulaRange[]; insightsCsv?: string }>({});

  useEffect(() => {
    if (!subject) return;
    setLoading(true);
    setError(null);
    api.get(`/knowledge-graph/subject/${encodeURIComponent(subject)}/concepts-flat`)
      .then(res => {
        const list: ConceptFlat[] = res.data?.concepts || [];
        setConcepts(list);
        setIdx(0);
      })
      .catch((e: any) => {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : (detail?.message || e.message || 'Failed to load concepts');
        setError(msg);
      })
      .finally(() => setLoading(false));
    // Load templates list
    api.get(`/templates?page=1&limit=100`)
      .then(res => {
        const items = (res.data?.data || []).map((t: any) => ({ id: t.id, name: t.name }));
        setTemplates(items);
      })
      .catch(() => {});
  }, [subject]);

  useEffect(() => {
    if (!current) return;
    // initialize form with current values when entering edit
    if (edit) {
      // Build combined insights
      const combinedInsights: string[] = (() => {
        const a = current.attributes || {};
        if (Array.isArray(a.insights)) return a.insights as string[];
        const tipsArr = Array.isArray(a.insights_tips)
          ? (a.insights_tips as string[])
          : (typeof a.insights_tips === 'string' && a.insights_tips ? String(a.insights_tips).split(',').map(s => s.trim()).filter(Boolean) : []);
        const analogiesArr = Array.isArray(a.insights_analogies)
          ? (a.insights_analogies as string[])
          : (typeof a.insights_analogies === 'string' && a.insights_analogies ? String(a.insights_analogies).split(',').map(s => s.trim()).filter(Boolean) : []);
        return [...tipsArr, ...analogiesArr];
      })();

      setForm({
        description: current.description || '',
        skillsCsv: (current.skills || []).join(', '),
        difficulty: current.difficulty || '',
        sequence: current.sequence || 0,
        threshold_mastery_score: current.threshold_mastery_score || 0.8,
        preferred_formula_evaluation: (current.attributes?.preferred_formula_evaluation as FormulaRange[] | undefined) || activeFormula || [],
        insightsCsv: combinedInsights.join(', ')
      });
      const conceptUuid = current.uuid || '';
      if (conceptUuid) {
        api.get(`/templates/concepts/${encodeURIComponent(conceptUuid)}/template`).then(res => {
          const tpl = res.data;
          setSelectedTemplateId(tpl?.id || '');
        }).catch(() => setSelectedTemplateId(''));
      } else {
        setSelectedTemplateId('');
      }
    } else {
      setForm({});
    }
    setSaveMsg(null);
  }, [idx, edit, current, activeFormula]);

  const handleSave = async () => {
    if (!current) return;
    try {
      setSaving(true);
      setSaveMsg(null);
      const body = {
        attributes: {
          ...(form.description !== undefined ? { description: form.description } : {}),
          ...(form.difficulty !== undefined ? { difficulty: form.difficulty } : {}),
          ...(form.sequence !== undefined ? { sequence: form.sequence } : {}),
          ...(form.threshold_mastery_score !== undefined ? { threshold_mastery_score: form.threshold_mastery_score } : {}),
          ...(form.skillsCsv !== undefined ? { skills: form.skillsCsv.split(',').map(s => s.trim()).filter(Boolean) } : {}),
          ...(form.preferred_formula_evaluation ? { preferred_formula_evaluation: form.preferred_formula_evaluation } : {}),
          ...(form.insightsCsv !== undefined ? { insights: String(form.insightsCsv || '').split(',').map(s => s.trim()).filter(Boolean) } : {})
        },
        prerequisite_to: current.prerequisite_to || [],
        relates_to: current.relates_to || [],
        part_of: current.part_of || []
      };
      await api.put(`/knowledge-graph/concepts/${encodeURIComponent(current.name)}/full`, body);
      // Save template association if concept id available
      const conceptUuid = current.uuid || '';
      if (conceptUuid) {
        if (selectedTemplateId) {
          await api.put(`/templates/concepts/${encodeURIComponent(conceptUuid)}/template/${encodeURIComponent(selectedTemplateId)}`);
        } else {
          await api.delete(`/templates/concepts/${encodeURIComponent(conceptUuid)}/template`).catch(() => {});
        }
      }
      setSaveMsg('Saved');
      setEdit(false);
      // refresh this concept locally
      const updated: ConceptFlat = {
        ...current,
        description: form.description ?? current.description,
        difficulty: form.difficulty ?? current.difficulty,
        sequence: form.sequence ?? current.sequence,
        threshold_mastery_score: form.threshold_mastery_score ?? current.threshold_mastery_score,
        skills: form.skillsCsv !== undefined ? form.skillsCsv.split(',').map(s => s.trim()).filter(Boolean) : current.skills,
        attributes: {
          ...(current.attributes || {}),
          ...(form.preferred_formula_evaluation ? { preferred_formula_evaluation: form.preferred_formula_evaluation } : {}),
          ...(form.insightsCsv !== undefined ? { insights: String(form.insightsCsv || '').split(',').map(s => s.trim()).filter(Boolean) } : {})
        }
      };
      setConcepts(prev => prev.map((c, i) => i === idx ? updated : c));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || e.message || 'Failed to save');
      setSaveMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!subject) return null;

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Concept Slideshow</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton disabled={idx <= 0} onClick={() => setIdx(i => Math.max(0, i - 1))}><ArrowBackIosNewIcon /></IconButton>
          <Typography variant="body2">{concepts.length ? idx + 1 : 0} / {concepts.length}</Typography>
          <IconButton disabled={idx >= concepts.length - 1} onClick={() => setIdx(i => Math.min(concepts.length - 1, i + 1))}><ArrowForwardIosIcon /></IconButton>
          {!edit ? (
            <Button size="small" startIcon={<EditIcon />} onClick={() => setEdit(true)} disabled={!current}>Edit</Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}>Save</Button>
              <Button size="small" startIcon={<CloseIcon />} onClick={() => setEdit(false)}>Cancel</Button>
            </Stack>
          )}
        </Stack>
      </Stack>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && !error && current && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{current.name}</Typography>

          {/* Description */}
          {!edit ? (
            <Typography variant="body2" sx={{ mb: 2 }}>{current.description || '-'}</Typography>
          ) : (
            <TextField label="Description" fullWidth multiline minRows={3} sx={{ mb: 2 }} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          )}

          {/* Skills */}
          <Typography variant="caption">Skills</Typography>
          {!edit ? (
            <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 0.5, flexWrap: 'wrap' }}>
              {(current.skills || []).map((s, i) => <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
              {(!current.skills || current.skills.length === 0) && <Typography variant="body2">-</Typography>}
            </Stack>
          ) : (
            <TextField label="Skills (comma separated)" fullWidth sx={{ mb: 2 }} value={form.skillsCsv ?? ''} onChange={e => setForm(f => ({ ...f, skillsCsv: e.target.value }))} />
          )}

          {/* Numeric/simple fields */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Difficulty" fullWidth disabled={!edit} value={edit ? (form.difficulty ?? '') : (current.difficulty || '')} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
            <TextField label="Sequence" type="number" fullWidth disabled={!edit} value={edit ? (form.sequence ?? 0) : (current.sequence || 0)} onChange={e => setForm(f => ({ ...f, sequence: Number(e.target.value) }))} />
            <TextField label="Threshold Mastery Score" type="number" inputProps={{ step: 0.01, min: 0, max: 1 }} fullWidth disabled={!edit} value={edit ? (form.threshold_mastery_score ?? 0.8) : (current.threshold_mastery_score || 0.8)} onChange={e => setForm(f => ({ ...f, threshold_mastery_score: Number(e.target.value) }))} />
          </Stack>

          {/* Content Template */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Content Template"
              select
              fullWidth
              disabled={!edit}
              SelectProps={{ native: true }}
              value={edit ? (selectedTemplateId || '') : (selectedTemplateId || '')}
              onChange={e => setSelectedTemplateId(e.target.value)}
            >
              <option value="">None</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </TextField>
          </Stack>

          {/* Insights (combined) */}
          <TextField
            label="Insights (comma separated)"
            multiline
            minRows={2}
            fullWidth
            disabled={!edit}
            sx={{ mb: 2 }}
            value={edit ? (form.insightsCsv ?? '') : (
              Array.isArray(current.attributes?.insights)
                ? (current.attributes!.insights as string[]).join(', ')
                : (typeof current.attributes?.insights === 'string' ? (current.attributes?.insights as string) : '')
            )}
            onChange={e => setForm(f => ({ ...f, insightsCsv: e.target.value }))}
          />

          {/* Formula evaluation */}
          <Typography variant="caption">Formula Evaluation Ranges</Typography>
          {!edit ? (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 2, flexWrap: 'wrap' }}>
              {(activeFormula || []).map((r, i) => (
                <Chip key={i} label={`${r.level}: ${r.min} - ${r.max}`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
              {(!activeFormula || activeFormula.length === 0) && <Typography variant="body2">-</Typography>}
            </Stack>
          ) : (
            <Box sx={{ mb: 2 }}>
              {(form.preferred_formula_evaluation || []).map((r, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                  <TextField label={`Level`} value={r.level} onChange={e => setForm(f => ({ ...f, preferred_formula_evaluation: (f.preferred_formula_evaluation || []).map((x, j) => j === i ? { ...x, level: e.target.value } : x) }))} />
                  <TextField label={`Min`} type="number" value={r.min} onChange={e => setForm(f => ({ ...f, preferred_formula_evaluation: (f.preferred_formula_evaluation || []).map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x) }))} />
                  <TextField label={`Max`} type="number" value={r.max} onChange={e => setForm(f => ({ ...f, preferred_formula_evaluation: (f.preferred_formula_evaluation || []).map((x, j) => j === i ? { ...x, max: Number(e.target.value) } : x) }))} />
                </Stack>
              ))}
              <Button size="small" onClick={() => setForm(f => ({ ...f, preferred_formula_evaluation: [ ...(f.preferred_formula_evaluation || []), { min: 0, max: 1, level: 'X' } ] }))}>Add Range</Button>
            </Box>
          )}

          {/* Relations (read-only here) */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="caption">Prerequisite To</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {(current.prerequisite_to || []).map((s, i) => <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                {(!current.prerequisite_to || current.prerequisite_to.length === 0) && <Typography variant="body2">-</Typography>}
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption">Relates To</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {(current.relates_to || []).map((s, i) => <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                {(!current.relates_to || current.relates_to.length === 0) && <Typography variant="body2">-</Typography>}
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption">Part Of</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {(current.part_of || []).map((s, i) => <Chip key={i} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                {(!current.part_of || current.part_of.length === 0) && <Typography variant="body2">-</Typography>}
              </Stack>
            </Box>
          </Stack>

          {saveMsg && <Typography variant="caption" color={saveMsg === 'Saved' ? 'success.main' : 'error'}>{saveMsg}</Typography>}
        </Box>
      )}
    </Paper>
  );
}


