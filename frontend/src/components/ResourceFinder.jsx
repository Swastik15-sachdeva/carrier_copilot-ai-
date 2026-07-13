import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function ResourceFinder({ apiKey }) {
  const [topic, setTopic] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResources('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/mentor/learning-resources', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: topic.trim(),
          target_role: targetRole.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Resources search server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setResources((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during resource curation.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Learning Resource Recommendations</h2>
        <p className="card-subtitle">Locate free courses, playlists, documentation links, and learning checklists for any topic.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="rf-topic">Topic to Learn</label>
            <input 
              type="text" 
              id="rf-topic" 
              placeholder="e.g. Docker, Git, PyTorch, React Router" 
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="rf-role">Target Job Role</label>
            <input 
              type="text" 
              id="rf-role" 
              placeholder="e.g. Cloud Architect, Frontend Engineer" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Finding Resources...' : 'Find Resources'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <h2 className="card-title">Curated Learning Resources</h2>
        
        {!loading && !resources && (
          <div className="empty-state">
            <span className="empty-icon">📚</span>
            <h3>No resources curated</h3>
            <p>Enter the topic and your career goal to load interactive guides, videos, docs, and concept checklists.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching courses, directories, and documentation...</p>
          </div>
        )}

        {resources && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{resources}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
