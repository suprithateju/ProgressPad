import React, { useState, useEffect } from 'react';
import { updateMocksBackup } from '../utils/backup';

export default function MockTests({ userExamId, backendUrl, examSlug, activeExamDetails }) {
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [sectionScores, setSectionScores] = useState({});
  const [tier, setTier] = useState('Prelims');
  const [notes, setNotes] = useState('');

  const subjects = activeExamDetails?.subjects || [];
  const safeCutoff = activeExamDetails?.safe_cutoff || 0;

  const getHeaders = (extraHeaders = {}) => {
    const email = localStorage.getItem('user_email') || '1';
    return {
      'X-User-Email': email,
      ...extraHeaders
    };
  };

  const fetchMocks = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/mocks`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMocks(data);
        updateMocksBackup(userExamId, data);
      }
    } catch (err) {
      console.error('Error fetching mock tests:', err);
    }
  };

  useEffect(() => {
    if (userExamId) {
      setLoading(true);
      fetchMocks().finally(() => {
        setLoading(false);
      });
    }
  }, [userExamId, backendUrl]);

  // Reset section scores when active exam details load
  useEffect(() => {
    if (subjects.length > 0) {
      const initialScores = {};
      subjects.forEach(sub => {
        initialScores[sub.name] = '';
      });
      setSectionScores(initialScores);
    }
  }, [activeExamDetails]);

  const handleScoreChange = (subjName, val) => {
    setSectionScores({
      ...sectionScores,
      [subjName]: val === '' ? '' : parseFloat(val)
    });
  };

  // Compute live total score in UI
  const calculateLiveTotal = () => {
    let total = 0;
    Object.keys(sectionScores).forEach(key => {
      total += parseFloat(sectionScores[key] || 0);
    });
    return total;
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!testName || !testDate) return;

    setError('');
    // Ensure all fields have values
    const scoresToSubmit = {};
    subjects.forEach(sub => {
      scoresToSubmit[sub.name] = sectionScores[sub.name] === '' ? 0 : parseFloat(sectionScores[sub.name]);
    });

    const maxScore = subjects.reduce((sum, sub) => sum + (sub.max_marks || 0), 0);

    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/mocks`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: testName,
          testDate,
          sectionScores: scoresToSubmit,
          maxScore,
          tier,
          notes
        })
      });

      if (res.ok) {
        setLogModalOpen(false);
        setTestName('');
        // Reset scores
        const resetScores = {};
        subjects.forEach(sub => { resetScores[sub.name] = ''; });
        setSectionScores(resetScores);
        setNotes('');
        fetchMocks();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log mock test');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMock = async (mockId) => {
    if (!window.confirm('Are you sure you want to delete this mock test record?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/mocks/${mockId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchMocks();
      }
    } catch (err) {
      console.error('Error deleting mock test:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <i className="ti ti-loader-3" style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', color: 'var(--accent)' }}></i>
      </div>
    );
  }

  const liveTotal = calculateLiveTotal();
  const averageMockScore = mocks.length > 0 
    ? parseFloat((mocks.reduce((sum, m) => sum + m.total_score, 0) / mocks.length).toFixed(1))
    : 0;

  const totalMaxMarks = subjects.reduce((sum, sub) => sum + (sub.max_marks || 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Top Banner stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Mock Average
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: averageMockScore >= safeCutoff && mocks.length > 0 ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
            {mocks.length > 0 ? `${averageMockScore} / ${totalMaxMarks}` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
            Based on {mocks.length} logged tests
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Target Safe Cutoff
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', marginTop: '0.25rem' }}>
            {safeCutoff}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
            {activeExamDetails?.conducting_body} Benchmark
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {mocks.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Log a mock test to analyze your performance gap!
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Cutoff Gap
              </div>
              <div className={`cutoff-gap-indicator ${averageMockScore >= safeCutoff ? 'positive' : 'negative'}`} style={{ marginTop: '0.4rem', fontSize: '1.25rem' }}>
                <i className={`ti ${averageMockScore >= safeCutoff ? 'ti-trending-up' : 'ti-trending-down'}`}></i>
                {averageMockScore >= safeCutoff ? '+' : ''}{(averageMockScore - safeCutoff).toFixed(1)} pts
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mock Tests List Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="ti ti-checklist" style={{ color: 'var(--accent)' }}></i>
              Logged Mock Tests
            </h3>
            <p style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>Verify score growth against {activeExamDetails?.name} syllabus cutoffs.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setLogModalOpen(true)} style={{ fontSize: '0.85rem' }}>
            <i className="ti ti-plus"></i> Log Mock Test
          </button>
        </div>

        {/* Mocks Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="mock-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Date</th>
                <th>Tier</th>
                <th>Subject Scores</th>
                <th>Total Score</th>
                <th>Status</th>
                <th style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((mock) => {
                const isPassed = mock.total_score >= safeCutoff;
                return (
                  <tr key={mock.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{mock.name}</div>
                      {mock.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          <i className="ti ti-notes"></i> "{mock.notes}"
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{mock.test_date}</td>
                    <td><span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>{mock.tier}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {Object.entries(mock.section_scores).map(([subName, score], sIdx) => {
                          const subMax = subjects.find(s => s.name === subName)?.max_marks || 0;
                          return (
                            <span
                              key={sIdx}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-color)',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              <strong>{subName}:</strong> {score}{subMax > 0 ? `/${subMax}` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }}>{mock.total_score}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}> / {mock.max_score}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${isPassed ? 'status-passed' : 'status-failed'}`}>
                        {isPassed ? 'Passed Cutoff' : 'Below Cutoff'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteMock(mock.id)}
                        style={{ color: '#ef4444', padding: '0.25rem', cursor: 'pointer' }}
                        title="Delete record"
                      >
                        <i className="ti ti-trash" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {mocks.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '3rem' }}>
                    No mock tests logged yet. Track your score progression by adding your first mock test.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG MOCK MODAL */}
      {logModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Log Mock Test</h3>
              <button onClick={() => setLogModalOpen(false)} style={{ cursor: 'pointer', fontSize: '1.25rem' }}>
                <i className="ti ti-x"></i>
              </button>
            </div>

            <form onSubmit={handleLogSubmit}>
              <div className="modal-body">
                {error && (
                  <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                    {error}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Mock Test Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. NTA Full Test #4"
                    required
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Test Date</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tier / Phase</label>
                    <select
                      className="form-select"
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                    >
                      <option value="Prelims">Prelims</option>
                      <option value="Mains">Mains</option>
                      <option value="CBT 1">CBT 1</option>
                      <option value="CBT 2">CBT 2</option>
                      <option value="Practice Sectional">Practice Sectional</option>
                    </select>
                  </div>
                </div>

                {/* Section Scores Section (Dynamic Subject Fields) */}
                <div style={{ margin: '1.25rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    Subject-wise Scores
                  </h4>
                  
                  <div className="mock-subject-scores-grid">
                    {subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="mock-subject-row"
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{sub.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            min="0"
                            max={sub.max_marks || 200}
                            step="0.1"
                            className="form-input"
                            style={{ width: '80px', padding: '0.3rem 0.5rem', textAlign: 'right' }}
                            placeholder="0"
                            required
                            value={sectionScores[sub.name] === undefined ? '' : sectionScores[sub.name]}
                            onChange={(e) => handleScoreChange(sub.name, e.target.value)}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            / {sub.max_marks || 100}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Score:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {liveTotal} / {totalMaxMarks}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Review observations &amp; Weaknesses</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Silly errors in math integration, ran out of time in physics..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLogModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Result</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
