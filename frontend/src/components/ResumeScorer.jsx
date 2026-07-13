import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function ResumeScorer({ apiKey }) {
  const [targetRole, setTargetRole] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heuristics, setHeuristics] = useState(null);
  const [aiReview, setAiReview] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please upload your resume PDF first.');
      return;
    }

    setLoading(true);
    setHeuristics(null);
    setAiReview('');

    const formData = new FormData();
    formData.append('target_role', targetRole.trim());
    formData.append('file', file);

    const headers = {};
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/resume/analyze', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error('Analysis server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setAiReview((prev) => prev + chunk);
        },
        (heuristicsData) => {
          setHeuristics(heuristicsData);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during resume analysis.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Upload Resume & Target Role</h2>
        <p className="card-subtitle">Upload your PDF resume and enter the role you want to score it against.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="resume-target-role">Target Job Role</label>
            <input 
              type="text" 
              id="resume-target-role" 
              placeholder="e.g. Frontend Engineer, Product Manager" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Resume PDF File</label>
            {!file ? (
              <div 
                className={`file-dropzone ${dragActive ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current.click()}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <span className="dropzone-icon">📥</span>
                <span className="dropzone-text">Drag & drop your PDF resume here or click to browse</span>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf" 
                  required 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="file-name-tag">
                <span className="file-icon">📄</span> 
                <span className="file-name-text">{file.name}</span>
                <button type="button" className="remove-btn" onClick={handleRemoveFile}>&times;</button>
              </div>
            )}
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze & Score Resume'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <h2 className="card-title">Analysis & ATS Feedback</h2>
        
        {!loading && !heuristics && !aiReview && (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <h3>No analysis performed yet</h3>
            <p>Provide your target role and upload a PDF resume to get ATS scores and optimization tips.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Extracting resume text and running ATS heuristics...</p>
          </div>
        )}

        {(heuristics || aiReview) && (
          <div style={{ display: 'block' }}>
            {heuristics && (
              <>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-value">{heuristics.score}</div>
                    <div className="metric-label">ATS Score Estimate</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{heuristics.word_count}</div>
                    <div className="metric-label">Word Count</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{heuristics.has_email && heuristics.has_phone ? 'Yes' : 'No'}</div>
                    <div className="metric-label">Contact Details</div>
                  </div>
                </div>

                <div className="score-breakdown-section">
                  <h3>Heuristics Checklist</h3>
                  <ul className="checklist-items">
                    <li>
                      <span className={`check-icon ${heuristics.word_count >= 300 && heuristics.word_count <= 1200 ? 'pass' : 'fail'}`}>
                        {heuristics.word_count >= 300 && heuristics.word_count <= 1200 ? '✓' : '✗'}
                      </span>
                      <span>Word Count: {heuristics.word_count} words (optimal range: 300 - 1200)</span>
                    </li>
                    <li>
                      <span className={`check-icon ${heuristics.has_email ? 'pass' : 'fail'}`}>
                        {heuristics.has_email ? '✓' : '✗'}
                      </span>
                      <span>Email address detected</span>
                    </li>
                    <li>
                      <span className={`check-icon ${heuristics.has_phone ? 'pass' : 'fail'}`}>
                        {heuristics.has_phone ? '✓' : '✗'}
                      </span>
                      <span>Phone number detected</span>
                    </li>
                    <li>
                      <span className={`check-icon ${heuristics.action_verb_count >= 3 ? 'pass' : 'fail'}`}>
                        {heuristics.action_verb_count >= 3 ? '✓' : '✗'}
                      </span>
                      <span>Action Verbs: {heuristics.action_verb_count} found (recommend at least 3)</span>
                    </li>
                    {heuristics.deductions.map((deduction, idx) => (
                      <li key={idx}>
                        <span className="check-icon fail">✗</span>
                        <span>{deduction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {aiReview && (
              <div className="ai-review-section">
                <h3>Gemini AI Structural Review</h3>
                <div className="stream-output markdown-body">
                  <ReactMarkdown>{aiReview}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
