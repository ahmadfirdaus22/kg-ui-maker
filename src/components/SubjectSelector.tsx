import React, { useState } from 'react';
import { Box, Button } from '@mui/material';

interface SubjectSelectorProps {
  onSelect: (subject: string) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelect }) => {
  const [subject, setSubject] = useState('');
  return (
    <Box display="flex" alignItems="center" gap={2} mb={2}>
      <input
        type="text"
        placeholder="Enter subject name..."
        value={subject}
        onChange={e => setSubject(e.target.value)}
        style={{ padding: 8, fontSize: 16 }}
      />
      <Button variant="contained" onClick={() => subject && onSelect(subject)}>
        Load Graph
      </Button>
    </Box>
  );
};

export default SubjectSelector; 