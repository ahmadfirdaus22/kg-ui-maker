'use client';

import React, { useState, useEffect } from 'react';
import MessageOverlay from './MessageOverlay';
import Select from 'react-select';

// Unicode icons for quick use
const ICONS = {
  type: '📦',
  difficulty: '🎯',
  relationships: '🔗',
  info: '🛈',
  skills: '🛠️',
  visualization: '🎨',
};

// Badge color for type
const typeBadgeColor = (type: string) => {
  if (type === 'Subject') return '#ff8a80';
  if (type === 'Topic') return '#b9f6ca';
  if (type === 'Concept') return '#82b1ff';
  return '#eee';
};

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  difficulty?: number;
  skills?: string[];
  visualization?: string;
  relationships?: Array<{
    target_node: string;
    type: string;
  }>;
  [key: string]: any;
}

interface InspectorPanelProps {
  node: GraphNode;
  onClose: () => void;
  allNodes: GraphNode[];
}

interface FormData {
  description: string;
  difficulty: number;
  skills: string[];
  visualization: string;
  part_of?: string[];
  prerequisite_to?: string[];
  relates_to?: string[];
}

interface MessageOverlayState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error';
}

// Helper to get all concepts/topics in the same subject
function getConceptsInSameSubject(node: GraphNode, allNodes: GraphNode[]): GraphNode[] {
  // Always return all concepts except the current node
  return allNodes.filter(n => n.type === 'Concept' && n.id !== node.id);
}

function getTopicsInSameSubject(node: GraphNode, allNodes: GraphNode[]): GraphNode[] {
  // Try to find the subject for this node
  let subjectId: string | undefined;
  if (node.type === 'Concept') {
    // Find the topic this concept is part of
    const topic = allNodes.find(n => n.type === 'Topic' && Array.isArray(n.part_of) && n.part_of.includes(node.id));
    if (topic) {
      // Find the subject this topic is part of
      const subject = allNodes.find(n => n.type === 'Subject' && Array.isArray(n.part_of) && n.part_of.includes(topic.id));
      if (subject) subjectId = subject.id;
    }
  } else if (node.type === 'Topic') {
    // Find the subject this topic is part of
    const subject = allNodes.find(n => n.type === 'Subject' && Array.isArray(n.part_of) && n.part_of.includes(node.id));
    if (subject) subjectId = subject.id;
  }
  let topics: GraphNode[] = [];
  if (subjectId) {
    topics = allNodes.filter(n => n.type === 'Topic' && Array.isArray(n.part_of) && n.part_of.includes(subjectId));
  }
  // Fallback: all topics
  if (topics.length === 0) {
    topics = allNodes.filter(n => n.type === 'Topic');
  }
  // Always include the current part_of topic(s) if not already in the list
  if (Array.isArray(node.part_of)) {
    node.part_of.forEach(topicId => {
      if (!topics.some(t => t.id === topicId)) {
        const topicNode = allNodes.find(n => n.type === 'Topic' && n.id === topicId);
        if (topicNode) topics.push(topicNode);
      }
    });
  }
  return topics;
}

const InspectorPanel: React.FC<InspectorPanelProps & { theme?: 'light' | 'dark', sidebarStyle?: boolean }> = ({ node, onClose, allNodes, theme = 'light', sidebarStyle = false }) => {
  console.log('InspectorPanel node:', node);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    description: node.description || '',
    difficulty: node.difficulty || 0,
    skills: node.skills || [],
    visualization: node.visualization || '',
    part_of: node.part_of ? [...node.part_of] : [],
    prerequisite_to: node.prerequisite_to ? [...node.prerequisite_to] : [],
    relates_to: node.relates_to ? [...node.relates_to] : [],
  });
  const [newSkill, setNewSkill] = useState('');
  const [messageOverlay, setMessageOverlay] = useState<MessageOverlayState>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  // Update form when a new node is selected
  useEffect(() => {
    setFormData({
      description: node.description || '',
      difficulty: node.difficulty || 0,
      skills: node.skills || [],
      visualization: node.visualization || '',
      part_of: node.part_of ? [...node.part_of] : [],
      prerequisite_to: node.prerequisite_to ? [...node.prerequisite_to] : [],
      relates_to: node.relates_to ? [...node.relates_to] : [],
    });
    setIsEditing(false); // Reset to view mode
  }, [node]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // First, update node attributes (not relations)
      const response = await fetch(`http://localhost:8000/api/v1/knowledge-graph/nodes/${node.type}/${encodeURIComponent(node.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          difficulty: String(formData.difficulty),
          skills: formData.skills,
          visualization: formData.visualization,
        }),
      });
      const result = await response.json();
      if (response.ok && (result.success || result.status === 'success' || result.name)) {
        // Now update relations if present
        const relResponse = await fetch(`http://localhost:8000/api/v1/knowledge-graph/nodes/${node.type}/${encodeURIComponent(node.name)}/relations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part_of: formData.part_of || [],
            prerequisite_to: formData.prerequisite_to || [],
            relates_to: formData.relates_to || [],
          }),
        });
        const relResult = await relResponse.json();
        if (!relResponse.ok) {
          setMessageOverlay({
            isVisible: true,
            message: relResult.message || 'Failed to save relations.',
            type: 'error',
          });
          setIsSaving(false);
          return;
        }
        setIsEditing(false);
        setMessageOverlay({
          isVisible: true,
          message: 'Changes saved successfully!',
          type: 'success',
        });
      } else {
        setMessageOverlay({
          isVisible: true,
          message: result.message || 'Failed to save changes.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setMessageOverlay({
        isVisible: true,
        message: 'An unexpected error occurred while saving changes.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }));
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', color: '#f5a623', fontSize: '1.2rem' }}>
      {[...Array(5)].map((_, i) => (
        <span key={i}>{i < rating ? '★' : '☆'}</span>
      ))}
      <span style={{marginLeft: '8px', fontSize: '1rem', color: '#666'}}>({rating}/5)</span>
    </div>
  );


  return (
    <>
      <MessageOverlay
        isVisible={messageOverlay.isVisible}
        message={messageOverlay.message}
        type={messageOverlay.type as 'success' | 'error'}
        onClose={() => setMessageOverlay({ ...messageOverlay, isVisible: false })}
      />
      {/* Only show backdrop/modal if not sidebarStyle */}
      {!sidebarStyle && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
        />
      )}
      <div
        className={sidebarStyle ? 'sidebar' : 'shadow-lg'}
        style={{
          backgroundColor: '#f9f9f9',
          borderLeft: '1px solid #ddd',
          color: '#333',
          width: sidebarStyle ? '100%' : '100%',
          maxWidth: sidebarStyle ? undefined : '32rem',
          boxSizing: 'border-box',
          fontFamily: 'sans-serif',
          position: sidebarStyle ? undefined : 'fixed',
          top: sidebarStyle ? undefined : 0,
          right: sidebarStyle ? undefined : 0,
          zIndex: sidebarStyle ? undefined : 1001,
          boxShadow: sidebarStyle ? undefined : '0 10px 40px rgba(0,0,0,0.15)',
          transition: sidebarStyle ? undefined : 'transform 0.3s',
          overflowY: 'auto',
          maxHeight: '100vh',
          height: 'auto',
          borderRadius: sidebarStyle ? undefined : '1.5rem',
          padding: sidebarStyle ? 0 : '1.5rem',
          margin: sidebarStyle ? 0 : '1.5rem 0 1.5rem auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Always show close button in sidebar mode */}
        {sidebarStyle && (
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              position: 'absolute',
              top: 12,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: '#888',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            ×
          </button>
        )}
        {/* Back button placeholder (hide in sidebar) */}
        {!sidebarStyle && (
          <div className="flex items-center mb-2">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 font-bold mr-2"
              aria-label="Close panel"
              style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}
            >
              ← Back
            </button>
          </div>
        )}
        <div className="flex justify-between items-start mb-6">
          <h2
            className={sidebarStyle ? 'node-title' : ''}
            style={{
              fontWeight: 'bold',
              fontSize: '1.4rem',
              color: '#007acc',
              marginBottom: '1rem',
              wordBreak: 'break-word',
            }}
          >
            {node.name}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Type Section */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Type</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>{ICONS.type}</span>
              <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '1.08rem' }}>Type</span>
              <span style={{
                background: typeBadgeColor(node.type),
                color: '#222',
                borderRadius: 12,
                padding: '0.2rem 0.8rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                marginLeft: 4
              }}>{node.type}</span>
            </div>
          </div>
          {/* Description Section */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Description</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.2rem' }}>{ICONS.info}</span>
              <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '1.08rem' }}>Description</span>
            </div>
            <div style={{ paddingLeft: 28 }}>
              {isEditing ? (
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  disabled={isSaving}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.5rem 0.75rem', marginTop: 4, border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
                />
              ) : (
                node.description ? (
                  <p style={{ fontSize: '1rem', color: '#222' }}>{node.description}</p>
                ) : (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1.1rem' }}>{ICONS.info}</span>
                    Description not yet provided. <a style={{ color: '#1565c0', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }} onClick={() => setIsEditing(true)} onMouseOver={e => e.currentTarget.style.color = '#005fa3'} onMouseOut={e => e.currentTarget.style.color = '#1565c0'}>Click Edit Details to add one.</a>
                  </div>
                )
              )}
            </div>
          </div>
          {/* Difficulty Section */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Difficulty</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{ICONS.difficulty}</span>
              <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '1.08rem' }}>Difficulty</span>
              {!isEditing && (
                node.difficulty! > 0 ? <StarRating rating={node.difficulty || 0} /> : <span style={{
                  background: '#eee',
                  color: '#222',
                  borderRadius: 12,
                  padding: '0.2rem 0.8rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  marginLeft: 4
                }}>Not specified</span>
              )}
            </div>
            {isEditing && (
              <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="difficulty" style={{ fontWeight: 500, color: '#64748b', fontSize: '1rem', marginBottom: 0 }}>Set difficulty (0-5)</label>
                <input
                  type="range"
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value, 10) })}
                  min="0"
                  max="5"
                  step="1"
                  disabled={isSaving}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <StarRating rating={formData.difficulty} />
              </div>
            )}
          </div>
          {/* Skills Section */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Skills</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.2rem' }}>{ICONS.skills}</span>
              <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '1.08rem' }}>Skills</span>
            </div>
            <div style={{ paddingLeft: 28 }}>
              {isEditing ? (
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                      placeholder="Add a new skill"
                      style={{ flex: 1, fontSize: '1rem', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                    <button onClick={handleAddSkill} style={{ padding: '0.5rem 1rem', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '1rem' }}>
                    {formData.skills.map(skill => (
                      <div key={skill} style={{ display: 'flex', alignItems: 'center', background: '#e0e0e0', borderRadius: 12, padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}>
                        {skill}
                        <button onClick={() => handleRemoveSkill(skill)} style={{ background: 'none', border: 'none', color: '#333', marginLeft: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                (node.skills && node.skills.length > 0) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {node.skills.map(skill => (
                      <span key={skill} style={{ background: '#e0e0e0', color: '#333', borderRadius: 12, padding: '0.3rem 0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem' }}>No skills specified.</div>
                )
              )}
            </div>
          </div>
          {/* Visualization Section */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Visualization</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1.2rem' }}>{ICONS.visualization}</span>
              <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '1.08rem' }}>Visualization</span>
            </div>
            <div style={{ paddingLeft: 28 }}>
              {isEditing ? (
                <textarea
                  id="visualization"
                  value={formData.visualization}
                  onChange={(e) => setFormData({ ...formData, visualization: e.target.value })}
                  className="w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={isSaving}
                  placeholder="e.g., URL to a visualization or a description"
                  style={{ width: '100%', fontSize: '1rem', padding: '0.5rem 0.75rem', marginTop: 4, border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
                />
              ) : (
                node.visualization ? (
                  <p style={{ fontSize: '1rem', color: '#222' }}>{node.visualization}</p>
                ) : (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem' }}>No visualization specified.</div>
                )
              )}
            </div>
          </div>
          {/* Robust Relationship Sections - always show columns */}
          {['PREREQUISITE', 'PART_OF', 'RELATES_TO'].map(type => {
            const label = type === 'PREREQUISITE' ? 'PREREQUISITE TO' : type === 'PART_OF' ? 'PART OF' : 'RELATES TO';
            const color = type === 'PREREQUISITE' ? '#1565c0' : type === 'PART_OF' ? '#43a047' : '#ff9800';
            let relIds: string[] = [];
            if (type === 'PART_OF' && Array.isArray(node.part_of)) relIds = node.part_of;
            else if (type === 'PREREQUISITE' && Array.isArray(node.prerequisite_to)) relIds = node.prerequisite_to;
            else if (type === 'RELATES_TO' && Array.isArray(node.relates_to)) relIds = node.relates_to;
            if (Array.isArray(node.relationships)) {
              relIds = relIds.concat(node.relationships.filter(rel => rel.type === type).map(rel => rel.target_node));
            }
            relIds = Array.from(new Set(relIds));
            const relNodes = relIds.map(id => allNodes.find(n => n.id === id)).filter(Boolean);
            // Editable options
            let options: GraphNode[] = [];
            if (isEditing) {
              if (type === 'PREREQUISITE' || type === 'RELATES_TO') {
                options = getConceptsInSameSubject(node, allNodes);
              } else if (type === 'PART_OF' && node.type === 'Concept') {
                options = getTopicsInSameSubject(node, allNodes);
                // Always include current part_of topics, even if not found in allNodes
                const currentPartOf = Array.isArray(node.part_of) ? node.part_of : [];
                currentPartOf.forEach(topicVal => {
                  if (!options.some(t => t.id === topicVal || t.name === topicVal)) {
                    let fallback = allNodes.find(n => (n.id === topicVal || n.name === topicVal) && n.type === 'Topic');
                    if (!fallback) {
                      fallback = { id: topicVal, name: topicVal, type: 'Topic' };
                    }
                    options.push(fallback);
                  }
                });
              }
            }
            return (
              <div key={type} style={{ padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 8 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.5rem' }}>{label}</div>
                {isEditing && type === 'PART_OF' && node.type === 'Concept' ? (
                  <>
                    <Select
                      isMulti
                      options={options.map(opt => ({ value: opt.id, label: opt.name }))}
                      value={options
                        .filter(opt => (formData.part_of || []).some(val => val === opt.id || val === opt.name))
                        .map(opt => ({ value: opt.id, label: opt.name }))}
                      onChange={selected => {
                        const selectedIds = Array.isArray(selected) ? selected.map(s => s.value) : [];
                        setFormData(prev => ({ ...prev, part_of: selectedIds }));
                      }}
                      styles={{
                        container: base => ({ ...base, marginLeft: 28, marginTop: 6, marginBottom: 6 }),
                        control: base => ({
                          ...base,
                          background: theme === 'dark' ? '#23272f' : '#fff',
                          color: theme === 'dark' ? '#ededed' : '#222',
                          borderRadius: 8,
                          borderColor: '#d1d5db',
                          minHeight: 48,
                          boxShadow: theme === 'dark' ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 6px rgba(0,0,0,0.06)',
                        }),
                        menu: base => ({
                          ...base,
                          background: theme === 'dark' ? '#23272f' : '#fff',
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        multiValue: base => ({
                          ...base,
                          background: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        option: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        input: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        singleValue: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                      }}
                      placeholder="Select part of..."
                    />
                    {options.length === 0 && (
                      <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem', paddingLeft: 28 }}>
                        No topics available.
                      </div>
                    )}
                  </>
                ) : isEditing ? (
                  options.length > 0 ? (
                    <Select
                      isMulti
                      options={options.map(opt => ({ value: opt.id, label: opt.name }))}
                      value={options
                        .filter(opt => {
                          if (type === 'PREREQUISITE') return (formData.prerequisite_to || []).includes(opt.id);
                          if (type === 'RELATES_TO') return (formData.relates_to || []).includes(opt.id);
                          return false;
                        })
                        .map(opt => ({ value: opt.id, label: opt.name }))}
                      onChange={selected => {
                        const selectedIds = Array.isArray(selected) ? selected.map(s => s.value) : [];
                        setFormData(prev => {
                          const newData = { ...prev };
                          if (type === 'PREREQUISITE') newData.prerequisite_to = selectedIds;
                          else if (type === 'RELATES_TO') newData.relates_to = selectedIds;
                          return newData;
                        });
                      }}
                      styles={{
                        container: base => ({ ...base, marginLeft: 28, marginTop: 6, marginBottom: 6 }),
                        control: base => ({
                          ...base,
                          background: theme === 'dark' ? '#23272f' : '#fff',
                          color: theme === 'dark' ? '#ededed' : '#222',
                          borderRadius: 8,
                          borderColor: '#d1d5db',
                          minHeight: 48,
                          boxShadow: theme === 'dark' ? '0 1px 6px rgba(0,0,0,0.12)' : '0 1px 6px rgba(0,0,0,0.06)',
                        }),
                        menu: base => ({
                          ...base,
                          background: theme === 'dark' ? '#23272f' : '#fff',
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        multiValue: base => ({
                          ...base,
                          background: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        option: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        input: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                        singleValue: base => ({
                          ...base,
                          color: theme === 'dark' ? '#ededed' : '#222',
                        }),
                      }}
                      placeholder={`Select ${label.toLowerCase()}...`}
                    />
                  ) : (
                    <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem', paddingLeft: 28 }}>
                      No options available.
                    </div>
                  )
                ) : relIds.length > 0 ? (
                  <ul style={{ paddingLeft: 28, margin: 0 }}>
                    {relIds.map((id, idx) => {
                      const relNode = allNodes.find(n => n.id === id);
                      return (
                        <li key={idx} style={{ marginBottom: 6, fontSize: '1rem', color: '#333', fontWeight: 500 }}>
                          {relNode ? relNode.name : id}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div style={{ color: '#888', fontStyle: 'italic', fontSize: '1rem', paddingLeft: 28 }}>
                    No {label.toUpperCase()} specified.
                  </div>
                )}
              </div>
            );
          })}
          {/* Edit button */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 6,
                cursor: 'pointer',
                marginTop: '0.5rem',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 1px 4px rgba(21,101,192,0.08)',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#005fa3'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#007acc'; }}
            >
              Edit Details
            </button>
          )}
          {/* Edit form (existing code) */}
          {isEditing && (
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  marginRight: '0.5rem',
                }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                style={{
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InspectorPanel; 