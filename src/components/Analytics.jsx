import React, { useState, useEffect } from 'react';

export default function Analytics({ userExamId, backendUrl, activeExamDetails }) {
  const [subjectStats, setSubjectStats] = useState([]);
  const [mocksTrend, setMocksTrend] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [crossExams, setCrossExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = async () => {
    try {
      // 1. Fetch Subject Progress
      const pRes = await fetch(`${backendUrl}/api/user-exams/${userExamId}/analytics`);
      const progressData = await pRes.json();
      setSubjectStats(progressData);

      // 2. Fetch Mocks Trend
      const tRes = await fetch(`${backendUrl}/api/user-exams/${userExamId}/mocks/trend`);
      const trendData = await tRes.json();
      setMocksTrend(trendData);

      // 3. Fetch Diagnostics
      const dRes = await fetch(`${backendUrl}/api/user-exams/${userExamId}/mocks/diagnostics`);
      const diagData = await dRes.json();
      setDiagnostics(diagData);

      // 4. Fetch Cross Exam summaries
      const cRes = await fetch(`${backendUrl}/api/analytics/all-exams`);
      const crossData = await cRes.json();
      setCrossExams(crossData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    if (userExamId) {
      setLoading(true);
      fetchAnalyticsData().finally(() => {
        setLoading(false);
      });
    }
  }, [userExamId, backendUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <i className="ti ti-loader-3" style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', color: 'var(--accent)' }}></i>
      </div>
    );
  }

  // Calculate coordinates for Custom SVG Line Chart
  const renderMockTrendChart = () => {
    if (mocksTrend.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          No mock tests logged. Log mock test results to view score graphs.
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find min and max score for scaling
    const scores = mocksTrend.map(m => m.total_score);
    const maxScoreVal = activeExamDetails?.subjects.reduce((sum, s) => sum + (s.max_marks || 0), 0) || 300;
    const safeCutoff = activeExamDetails?.safe_cutoff || 0;

    const yMax = Math.max(maxScoreVal, ...scores);
    const yMin = 0;

    const getX = (index) => {
      if (mocksTrend.length <= 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (index / (mocksTrend.length - 1)) * chartWidth;
    };

    const getY = (score) => {
      const scale = (score - yMin) / (yMax - yMin);
      return height - paddingBottom - scale * chartHeight;
    };

    // Build line path
    let pathD = '';
    mocksTrend.forEach((m, idx) => {
      const x = getX(idx);
      const y = getY(m.total_score);
      if (idx === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    });

    const cutoffY = getY(safeCutoff);

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="var(--border-color)" strokeWidth="0.5" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="var(--border-color)" strokeWidth="1" />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 8} y={paddingTop + 4} fill="var(--text-tertiary)" fontSize="9" textAnchor="end">{yMax}</text>
          <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 4} fill="var(--text-tertiary)" fontSize="9" textAnchor="end">{Math.round(yMax / 2)}</text>
          <text x={paddingLeft - 8} y={height - paddingBottom + 4} fill="var(--text-tertiary)" fontSize="9" textAnchor="end">0</text>

          {/* Dotted Cutoff Line */}
          {safeCutoff > 0 && (
            <>
              <line
                x1={paddingLeft}
                y1={cutoffY}
                x2={width - paddingRight}
                y2={cutoffY}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x={width - paddingRight} y={cutoffY - 4} fill="#ef4444" fontSize="8" fontWeight="600" textAnchor="end">
                Cutoff ({safeCutoff})
              </text>
            </>
          )}

          {/* Trend Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Score dots & labels */}
          {mocksTrend.map((m, idx) => {
            const x = getX(idx);
            const y = getY(m.total_score);
            return (
              <g key={m.id}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--accent)"
                  stroke="var(--bg-secondary)"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={y - 8}
                  fill="var(--text-primary)"
                  fontSize="8.5"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {m.total_score}
                </text>
                <text
                  x={x}
                  y={height - paddingBottom + 14}
                  fill="var(--text-secondary)"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {m.test_date.substring(5)} {/* MM-DD */}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* 2 Column Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Row 1 Grid: Subject Progress Rings & Score Progression Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Left panel: Completion details */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="ti ti-chart-pie" style={{ color: 'var(--accent)' }}></i>
              Subject Progress Ring
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-around', alignItems: 'center' }}>
              {subjectStats.map((stat, idx) => {
                // Circle SVG details
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (stat.percentage / 100) * circumference;

                return (
                  <div key={idx} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '0.5rem' }}>
                      <svg width="100" height="100">
                        {/* Background ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="var(--bg-tertiary)"
                          strokeWidth="8"
                        />
                        {/* Progress ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke={stat.color || 'var(--accent)'}
                          strokeWidth="8"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                        />
                      </svg>
                      {/* Percent indicator */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                        {stat.percentage}%
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{stat.subjectName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{stat.doneTopics} / {stat.totalTopics} Topics</div>
                  </div>
                );
              })}
              {subjectStats.length === 0 && (
                <div style={{ color: 'var(--text-tertiary)', padding: '2rem' }}>No subject statistics available.</div>
              )}
            </div>
          </div>

          {/* Right panel: SVG Line chart */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="ti ti-chart-line" style={{ color: 'var(--accent)' }}></i>
              Score Progression Trend
            </h3>
            {renderMockTrendChart()}
          </div>

        </div>

        {/* Diagnostics & Weakness Analysis Checkbox */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <i className="ti ti-heart-broken" style={{ color: '#ef4444' }}></i>
            Weakness Diagnostics Checklist
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            These areas are flagged based on section scores falling below 60% in your logged mock tests.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {diagnostics?.weaknesses && diagnostics.weaknesses.map((weak, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {weak.subjectName}
                  </span>
                  <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {weak.percentage}% Avg Score
                  </span>
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Recommended immediate study items:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {weak.pendingHighPriorityTopics.map((top, tIdx) => (
                    <div
                      key={tIdx}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        borderLeft: '3px solid #ef4444',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{top.topic}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                        <span>Book: {top.recommended_resource || 'Standard'}</span>
                        <span style={{ color: '#ef4444' }}>{top.priority} Priority</span>
                      </div>
                    </div>
                  ))}
                  {weak.pendingHighPriorityTopics.length === 0 && (
                    <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      No pending high-priority topics!
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!diagnostics?.weaknesses || diagnostics.weaknesses.length === 0) && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No weakness alerts active. Either you haven't logged any mock tests, or your averages are solid across all sections! Good job! 👍
              </div>
            )}
          </div>
        </div>

        {/* Cross Exam Dashboard Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-layout" style={{ color: 'var(--accent)' }}></i>
            Multi-Exam Enrolled Overview
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {crossExams.map((ex) => (
              <div
                key={ex.userExamId}
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${ex.isPrimary ? 'var(--accent)' : 'var(--border-color)'}`,
                  padding: '1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: ex.isPrimary ? '0 0 10px rgba(var(--accent-rgb), 0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {ex.examName}
                  </h4>
                  {ex.isPrimary && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                      Primary
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Target Date: <strong style={{ color: 'var(--text-primary)' }}>{ex.targetDate || 'Not Set'}</strong>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                    <span>Syllabus Progress</span>
                    <strong>{ex.progressPercent}%</strong>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${ex.progressPercent}%`, height: '100%', background: ex.isPrimary ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: '3px' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-tertiary)' }}>
                  <span>Completed: {ex.doneTopics} / {ex.totalTopics}</span>
                  {ex.avgMockScore && <span>Mock Avg: {ex.avgMockScore}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
    </div>
  );
}
