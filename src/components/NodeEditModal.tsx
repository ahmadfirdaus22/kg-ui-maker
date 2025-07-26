import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

interface NodeEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; skills?: string[] }) => void;
  initialData: { name: string; description: string; skills?: string[] };
  showSkills?: boolean;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ open, onClose, onSave, initialData, showSkills }) => {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [skills, setSkills] = useState((initialData.skills || []).join(', '));

  useEffect(() => {
    setName(initialData.name);
    setDescription(initialData.description);
    setSkills((initialData.skills || []).join(', '));
  }, [initialData]);

  const handleSave = () => {
    const data: { name: string; description: string; skills?: string[] } = {
      name,
      description,
    };
    if (showSkills) {
      data.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    onSave(data);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} mt={1}>
      <TextField
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        fullWidth
      />
      <TextField
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
      {showSkills && (
        <TextField
          label="Skills (comma separated)"
          value={skills}
          onChange={e => setSkills(e.target.value)}
          fullWidth
        />
      )}
      <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </Box>
    </Box>
  );
};

export default NodeEditModal; 