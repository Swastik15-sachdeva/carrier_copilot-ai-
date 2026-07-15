import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';
import Mermaid from './Mermaid';

export default function ResumeScorer() {
  const [targetRole, setTargetRole] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heuristics, setHeuristics] = useState(null);
  const [aiReview, setAiReview] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [streamMetrics, setStreamMetrics] = useState({
    status: 'idle', // 'idle' | 'connecting' | 'heuristics_received' | 'streaming' | 'completed'
    startTime: 0,
    elapsedTime: 0,
    ttft: null,
    charsReceived: 0,
    speed: 0
  });

  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const refineAbortControllerRef = useRef(null);

  const [refineBullet, setRefineBullet] = useState('');
  const [refineFocus, setRefineFocus] = useState('Metrics');
  const [refinedOutput, setRefinedOutput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);

  const handleRefineSubmit = async (e) => {
    e.preventDefault();
    if (!refineBullet.trim()) return;
    if (refineLoading) return;

    if (refineAbortControllerRef.current) {
      refineAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    refineAbortControllerRef.current = controller;

    setRefineLoading(true);
    setRefinedOutput('');

    try {
      const response = await fetch('/resume/refine-bullet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bullet: refineBullet.trim(),
          focus: refineFocus,
          target_role: targetRole.trim() || 'Software Engineer'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Refine bullet server error.');
      }

      await readStream(
        response,
        (chunk) => {
          setRefinedOutput((prev) => prev + chunk);
        }
      );

      setRefineLoading(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      alert('An error occurred during bullet point refinement.');
      setRefineLoading(false);
    }
  };

  const handleCopyRefined = () => {
    if (!refinedOutput) return;
    navigator.clipboard.writeText(refinedOutput.replace(/^•\s*|^\-\s*/, ''));
    alert('Refined bullet point copied to clipboard!');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refineAbortControllerRef.current) {
        refineAbortControllerRef.current.abort();
      }
    };
  }, []);

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
    if (loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setHeuristics(null);
    setAiReview('');

    if (timerRef.current) clearInterval(timerRef.current);
    setStreamMetrics({
      status: 'connecting',
      startTime: Date.now(),
      elapsedTime: 0,
      ttft: null,
      charsReceived: 0,
      speed: 0
    });

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setStreamMetrics((prev) => {
        if (prev.status === 'completed' || prev.status === 'idle') {
          clearInterval(timerRef.current);
          return prev;
        }
        return {
          ...prev,
          elapsedTime: ((Date.now() - startTime) / 1000).toFixed(1)
        };
      });
    }, 100);

    const formData = new FormData();
    formData.append('target_role', targetRole.trim());
    formData.append('file', file);

    const headers = {};

    try {
      const response = await fetch('/resume/analyze', {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Analysis server error.');
      }

      await readStream(
        response,
        (chunk) => {
          setAiReview((prev) => prev + chunk);
          setStreamMetrics((prev) => {
            const now = Date.now();
            const newTtft = prev.ttft === null ? (now - startTime) : prev.ttft;
            const newChars = prev.charsReceived + chunk.length;
            const activeTime = (now - startTime) / 1000;
            const newSpeed = activeTime > 0 ? Math.round(newChars / activeTime) : 0;
            return {
              ...prev,
              status: 'streaming',
              ttft: newTtft,
              charsReceived: newChars,
              speed: newSpeed
            };
          });
        },
        (heuristicsData) => {
          setHeuristics(heuristicsData);
          setStreamMetrics((prev) => ({
            ...prev,
            status: 'heuristics_received'
          }));
        }
      );

      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setStreamMetrics((prev) => ({
        ...prev,
        status: 'completed'
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (timerRef.current) clearInterval(timerRef.current);
      setStreamMetrics((prev) => ({
        ...prev,
        status: 'idle'
      }));
      console.error(error);
      alert('An error occurred during resume analysis.');
      setLoading(false);
    }
  };

  return (
    <div className="resume-scorer-container">
      {/* Top Section: Side-by-Side Upload & Metrics */}
      <div className="resume-scorer-top-grid">
        {/* Left Column wrapper to stack Upload and Bullet Refiner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Left Column: Upload Resume & Target Role */}
          <div className="card resume-upload-card" style={{ height: 'auto' }}>
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

          {/* Resume Bullet Point Improver widget card */}
          <div className="card bullet-refiner-card">
            <h2 className="card-title">Resume Bullet Point Improver</h2>
            <p className="card-subtitle">Rewrite a boring resume point into a high-impact, quantified item.</p>
            
            <form onSubmit={handleRefineSubmit} className="app-form">
              <div className="form-group">
                <label htmlFor="refine-bullet-text">Boring Bullet Point</label>
                <textarea 
                  id="refine-bullet-text" 
                  placeholder="e.g. Responsible for writing unit tests and fixing bugs." 
                  rows={2} 
                  required
                  value={refineBullet}
                  onChange={(e) => setRefineBullet(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label htmlFor="refine-focus">Improvement Focus</label>
                  <select 
                    id="refine-focus" 
                    value={refineFocus}
                    onChange={(e) => setRefineFocus(e.target.value)}
                  >
                    <option value="Metrics">Add Metrics (Impact)</option>
                    <option value="Action">Action Verbs (Power)</option>
                    <option value="Concise">Make Concise (Density)</option>
                    <option value="Tailor">Tailor to Role (Keywords)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-full" disabled={refineLoading}>
                    {refineLoading ? 'Refining...' : 'Refine Point'}
                  </button>
                </div>
              </div>
            </form>

            {(refineLoading || refinedOutput) && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Improved Output:</h4>
                  {refinedOutput && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      onClick={handleCopyRefined}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div className="refined-output-box">
                  {refinedOutput || (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                      Refining bullet point...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ATS Metrics */}
        <div className="card resume-metrics-card">
          <div className="panel-header-actions">
            <h2 className="card-title">ATS Metrics</h2>
            {heuristics && (
              <button className="btn btn-secondary btn-sm print-btn" onClick={() => window.print()}>
                🖨️ Export PDF
              </button>
            )}
          </div>
          <p className="card-subtitle">ATS suitability score and heuristics details.</p>
          
          {!loading && !heuristics && (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <h3>No metrics computed yet</h3>
              <p>Provide your target role and upload a PDF resume to compute score and metrics.</p>
            </div>
          )}

          {loading && !heuristics && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Computing ATS scoring metrics...</p>
            </div>
          )}

          {heuristics && (
            <div className="metrics-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
              {/* Visual Circle Progress Score Gauge */}
              <div className="gauge-score-container" style={{ marginBottom: '0.5rem' }}>
                <div className="gauge-svg-wrapper">
                  <svg width="140" height="140">
                    <circle className="gauge-ring-bg" cx="70" cy="70" r="60" />
                    <circle 
                      className={`gauge-ring-progress ${heuristics.score >= 80 ? 'good' : heuristics.score >= 60 ? 'average' : 'poor'}`} 
                      cx="70" 
                      cy="70" 
                      r="60" 
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - heuristics.score / 100)}
                    />
                  </svg>
                  <div className="gauge-svg-text">
                    <div className="gauge-svg-value">{heuristics.score}</div>
                    <div className="gauge-svg-label">ATS Score</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {heuristics.score >= 80 ? '🔥 Great ATS Alignment! Minor improvements suggested.' : 
                   heuristics.score >= 60 ? '⚠️ Average alignment. Some critical sections or formatting need work.' : 
                   '❌ Poor alignment. Significant adjustments required to pass ATS filters.'}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="metrics-grid" style={{ marginBottom: '0.5rem' }}>
                {/* 1. Word Count */}
                <div className="metric-card">
                  <div className="metric-value">{heuristics.word_count}</div>
                  <div className="metric-label">Word Count</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${
                        heuristics.word_count >= 300 && heuristics.word_count <= 1200 ? 'good' : 
                        heuristics.word_count >= 100 && heuristics.word_count <= 1500 ? 'average' : 'poor'
                      }`}
                      style={{ width: `${Math.min(100, (heuristics.word_count / 1200) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2. Action Verbs */}
                <div className="metric-card">
                  <div className="metric-value">{heuristics.action_verb_count}</div>
                  <div className="metric-label">Action Verbs</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.action_verb_count >= 3 ? 'good' : 'poor'}`}
                      style={{ width: `${Math.min(100, (heuristics.action_verb_count / 8) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3. Quantifiable Metrics */}
                <div className="metric-card">
                  <div className="metric-value">{heuristics.quantifiable_metrics_count}</div>
                  <div className="metric-label">Quantifiable Metrics</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.quantifiable_metrics_count >= 3 ? 'good' : heuristics.quantifiable_metrics_count >= 1 ? 'average' : 'poor'}`}
                      style={{ width: `${Math.min(100, (heuristics.quantifiable_metrics_count / 5) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4. Section Completeness */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: (heuristics.sections_found?.length || 0) >= 5 ? '#00f2fe' : (heuristics.sections_found?.length || 0) >= 3 ? '#f1c40f' : '#ef4444' }}>
                    {heuristics.sections_found?.length || 0}/6
                  </div>
                  <div className="metric-label">Sections Found</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${(heuristics.sections_found?.length || 0) >= 5 ? 'good' : (heuristics.sections_found?.length || 0) >= 3 ? 'average' : 'poor'}`}
                      style={{ width: `${Math.min(100, (((heuristics.sections_found?.length || 0) / 6) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* 5. Template Cleanliness */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: !heuristics.has_placeholders ? '#00f2fe' : '#ef4444' }}>
                    {!heuristics.has_placeholders ? 'Clean' : 'Issues'}
                  </div>
                  <div className="metric-label">Template Check</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${!heuristics.has_placeholders ? 'good' : 'poor'}`}
                      style={{ width: !heuristics.has_placeholders ? '100%' : '30%' }}
                    ></div>
                  </div>
                </div>

                {/* 6. Clichés & Buzzwords */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: heuristics.buzzword_count > 3 ? '#ef4444' : heuristics.buzzword_count > 0 ? '#f1c40f' : '#00f2fe' }}>
                    {heuristics.buzzword_count || 0}
                  </div>
                  <div className="metric-label">Cliché Count</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.buzzword_count > 3 ? 'poor' : heuristics.buzzword_count > 0 ? 'average' : 'good'}`}
                      style={{ width: `${Math.min(100, ((heuristics.buzzword_count || 0) / 6) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 7. Chronology */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: heuristics.has_dates ? '#00f2fe' : '#ef4444' }}>
                    {heuristics.has_dates ? 'Detected' : 'Missing'}
                  </div>
                  <div className="metric-label">Chronology Check</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.has_dates ? 'good' : 'poor'}`}
                      style={{ width: heuristics.has_dates ? '100%' : '0%' }}
                    ></div>
                  </div>
                </div>

                {/* 8. Contact Details */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: heuristics.has_email && heuristics.has_phone ? '#00f2fe' : heuristics.has_email || heuristics.has_phone ? '#f1c40f' : '#ef4444' }}>
                    {heuristics.has_email && heuristics.has_phone ? 'Complete' : heuristics.has_email || heuristics.has_phone ? 'Partial' : 'Missing'}
                  </div>
                  <div className="metric-label">Contact Details</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.has_email && heuristics.has_phone ? 'good' : heuristics.has_email || heuristics.has_phone ? 'average' : 'poor'}`}
                      style={{ width: heuristics.has_email && heuristics.has_phone ? '100%' : heuristics.has_email || heuristics.has_phone ? '50%' : '0%' }}
                    ></div>
                  </div>
                </div>

                {/* 9. Professional Links */}
                <div className="metric-card">
                  <div className="metric-value" style={{ color: heuristics.has_github && heuristics.has_linkedin ? '#00f2fe' : heuristics.has_github || heuristics.has_linkedin ? '#f1c40f' : '#ef4444' }}>
                    {heuristics.has_github && heuristics.has_linkedin ? 'Both Found' : 
                     heuristics.has_linkedin ? 'LinkedIn Only' : 
                     heuristics.has_github ? 'GitHub Only' : 'Missing'}
                  </div>
                  <div className="metric-label">Professional Links</div>
                  <div className="linear-progress-wrapper">
                    <div 
                      className={`linear-progress-bar ${heuristics.has_github && heuristics.has_linkedin ? 'good' : heuristics.has_github || heuristics.has_linkedin ? 'average' : 'poor'}`}
                      style={{ width: heuristics.has_github && heuristics.has_linkedin ? '100%' : heuristics.has_github || heuristics.has_linkedin ? '50%' : '0%' }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Heuristics Checklist */}
              <div className="score-breakdown-section" style={{ marginBottom: 0 }}>
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
                  <li>
                    <span className="check-icon" style={{ color: heuristics.quantifiable_metrics_count >= 3 ? 'var(--color-success)' : heuristics.quantifiable_metrics_count >= 1 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {heuristics.quantifiable_metrics_count >= 1 ? '✓' : '✗'}
                    </span>
                    <span>Quantifiable Metrics: {heuristics.quantifiable_metrics_count} found (recommend at least 3)</span>
                  </li>
                  <li>
                    <span className="check-icon" style={{ color: heuristics.has_github && heuristics.has_linkedin ? 'var(--color-success)' : heuristics.has_github || heuristics.has_linkedin ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {heuristics.has_github || heuristics.has_linkedin ? '✓' : '✗'}
                    </span>
                    <span>Online Profiles: {heuristics.has_github && heuristics.has_linkedin ? 'GitHub & LinkedIn found' : heuristics.has_github ? 'GitHub only' : heuristics.has_linkedin ? 'LinkedIn only' : 'Missing links'}</span>
                  </li>
                  <li>
                    <span className="check-icon" style={{ color: heuristics.sections_missing?.length === 0 ? 'var(--color-success)' : heuristics.sections_found?.length >= 3 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {heuristics.sections_missing?.length === 0 ? '✓' : '✗'}
                    </span>
                    <span>Sections Found: {heuristics.sections_found?.length || 0}/6 standard sections</span>
                  </li>
                  <li>
                    <span className="check-icon" style={{ color: !heuristics.has_placeholders ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {!heuristics.has_placeholders ? '✓' : '✗'}
                    </span>
                    <span>Template Cleanliness: {!heuristics.has_placeholders ? 'No placeholder elements detected' : 'Placeholder/bracketed elements found'}</span>
                  </li>
                  <li>
                    <span className="check-icon" style={{ color: (heuristics.buzzword_count || 0) <= 3 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {(heuristics.buzzword_count || 0) <= 3 ? '✓' : '✗'}
                    </span>
                    <span>Cliché Buzzwords: {heuristics.buzzword_count || 0} found (recommend 3 or fewer)</span>
                  </li>
                  <li>
                    <span className="check-icon" style={{ color: heuristics.has_dates ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {heuristics.has_dates ? '✓' : '✗'}
                    </span>
                    <span>Chronology & Timelines: {heuristics.has_dates ? 'Dates/years detected' : 'No date markers detected'}</span>
                  </li>
                  {heuristics.deductions.map((deduction, idx) => (
                    <li key={idx}>
                      <span className="check-icon fail">✗</span>
                      <span>{deduction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: API Performance & AI Review Feedback */}
      {(streamMetrics.status !== 'idle' || heuristics || aiReview) && (
        <div className="card resume-feedback-card">
          <h2 className="card-title">Analysis & ATS Feedback</h2>
          <p className="card-subtitle">Real-time processing stats and structured AI review suggestions.</p>
          
          {/* Real-time API Performance Monitor */}
          {streamMetrics.status !== 'idle' && (
            <div className="stream-performance-card" style={{ marginBottom: '1.5rem' }}>
              <div className="performance-header">
                <h3 style={{ margin: 0, fontSize: '0.85rem' }}>
                  <span className={`status-dot-pulse ${streamMetrics.status === 'connecting' ? 'connecting' : streamMetrics.status === 'completed' ? 'idle' : ''}`}></span>
                  Real-time API Performance
                </h3>
                <span className="badge" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  {streamMetrics.status === 'connecting' ? 'Connecting to backend...' : 
                   streamMetrics.status === 'heuristics_received' ? 'Heuristics compiled' : 
                   streamMetrics.status === 'streaming' ? 'Streaming AI Review...' : 
                   'Analysis completed'}
                </span>
              </div>
              <div className="performance-grid">
                <div className="performance-item">
                  <span className="performance-value">
                    {streamMetrics.ttft !== null ? `${(streamMetrics.ttft / 1000).toFixed(2)}s` : 'Waiting...'}
                  </span>
                  <span className="performance-label">Latency (TTFT)</span>
                </div>
                <div className="performance-item">
                  <span className="performance-value">
                    {streamMetrics.speed > 0 ? `${streamMetrics.speed} ch/s` : '0 ch/s'}
                  </span>
                  <span className="performance-label">Stream Speed</span>
                </div>
                <div className="performance-item">
                  <span className="performance-value">{streamMetrics.elapsedTime}s</span>
                  <span className="performance-label">Elapsed Time</span>
                </div>
                <div className="performance-item">
                  <span className="performance-value">
                    {(streamMetrics.charsReceived / 1024).toFixed(2)} KB
                  </span>
                  <span className="performance-label">Content Streamed</span>
                </div>
              </div>
            </div>
          )}

          {/* Role Suitability Verdict Card */}
          {heuristics && (
            <div className={`role-verdict-card ${heuristics.score >= 80 ? 'ready' : heuristics.score >= 60 ? 'improvements' : 'critical'}`} style={{ marginBottom: aiReview ? '1.5rem' : '0' }}>
              <div className="role-verdict-icon">
                {heuristics.score >= 80 ? '✅' : heuristics.score >= 60 ? '⚠️' : '❌'}
              </div>
              <div className="role-verdict-content">
                <div className={`role-verdict-title ${heuristics.score >= 80 ? 'ready' : heuristics.score >= 60 ? 'improvements' : 'critical'}`}>
                  {heuristics.score >= 80 ? 'ATS Approved & Ready' : heuristics.score >= 60 ? 'Improvements Recommended' : 'Significant Revisions Required'}
                </div>
                <div className="role-verdict-desc">
                  {heuristics.score >= 80 
                    ? `Your resume is well-suited for the "${targetRole || 'targeted'}" role! You can apply with confidence, but addressing the minor suggestions below will maximize your chances.`
                    : heuristics.score >= 60
                    ? `Your resume has partial alignment for the "${targetRole || 'targeted'}" role. Some improvements are needed to make it competitive.`
                    : `Your resume needs critical updates for the "${targetRole || 'targeted'}" role. Key sections, keywords, or structure are missing.`
                  }
                </div>
              </div>
            </div>
          )}

          {/* Detailed AI Feedback Review */}
          {aiReview && (
            <div className="ai-review-section" style={{ marginTop: 0 }}>
              <h3>Gemini AI Structural Review</h3>
              <div className="stream-output markdown-body">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-mermaid/.test(className || '');
                      if (!inline && match) {
                        return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    }
                  }}
                >
                  {aiReview}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
