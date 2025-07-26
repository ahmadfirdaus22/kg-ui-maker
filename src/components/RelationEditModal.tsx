import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress, Autocomplete } from '@mui/material';
import axios from 'axios';

interface RelationEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { prerequisite_to: string[]; relates_to: string[]; part_of: string[] }) => void;
  initialData: { prerequisite_to: string[]; relates_to: string[]; part_of: string[] };
  subjectName: string;
}

const RelationEditModal: React.FC<RelationEditModalProps> = ({ open, onClose, onSave, initialData, subjectName }) => {
  const [prerequisiteTo, setPrerequisiteTo] = useState<string[]>(initialData.prerequisite_to);
  const [relatesTo, setRelatesTo] = useState<string[]>(initialData.relates_to);
  const [partOf, setPartOf] = useState<string[]>(initialData.part_of);
  const [conceptOptions, setConceptOptions] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPrerequisiteTo(initialData.prerequisite_to);
    setRelatesTo(initialData.relates_to);
    setPartOf(initialData.part_of);
  }, [initialData]);

  useEffect(() => {
    if (!open || !subjectName) return;
    setLoading(true);
    axios.get(`http://localhost:8000/api/v1/knowledge-graph/subject/${encodeURIComponent(subjectName)}/concepts-topics`)
      .then(res => {
        setConceptOptions(res.data.concepts.map((c: any) => c.name));
        setTopicOptions(res.data.topics.map((t: any) => t.name));
      })
      .finally(() => setLoading(false));
  }, [open, subjectName]);

  const handleSave = () => {
    onSave({
      prerequisite_to: prerequisiteTo,
      relates_to: relatesTo,
      part_of: partOf,
    });
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} mt={1}>
      {loading ? <CircularProgress /> : <>
        <Autocomplete
          multiple
          options={conceptOptions}
          value={prerequisiteTo}
          onChange={(_, v) => setPrerequisiteTo(v)}
          renderInput={(params) => <TextField {...params} label="Prerequisite To" placeholder="Select concepts" />}
        />
        <Autocomplete
          multiple
          options={conceptOptions}
          value={relatesTo}
          onChange={(_, v) => setRelatesTo(v)}
          renderInput={(params) => <TextField {...params} label="Relates To" placeholder="Select concepts" />}
        />
        <Autocomplete
          multiple
          options={topicOptions}
          value={partOf}
          onChange={(_, v) => setPartOf(v)}
          renderInput={(params) => <TextField {...params} label="Part Of" placeholder="Select topics" />}
        />
      </>}
      <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>Save</Button>
      </Box>
    </Box>
  );
};

export default RelationEditModal; 