import React, { useState, useEffect, useRef } from 'react';

export default function AISpace({ userExamId, backendUrl, activeExamDetails, initialTopic, activeTab: defaultSubTab }) {
  const [subTab, setSubTab] = useState(defaultSubTab || 'buddy'); // 'buddy', 'explain', 'quiz', 'compare', 'plan'
  const [syllabus, setSyllabus] = useState([]);
  const [examsRegistry, setExamsRegistry] = useState([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = (extraHeaders = {}) => {
    const email = localStorage.getItem('user_email') || '1';
    return {
      'X-User-Email': email,
      ...extraHeaders
    };
  };

  // 1. Study Buddy (Chat) State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: `Hi! I'm your ProgressPad AI Study Coach. I have your active exam profile loaded. How can I help you prepare today?` }
  ]);
  const messagesEndRef = useRef(null);

  // 2. Explain Topic State
  const [explainSubjectId, setExplainSubjectId] = useState('');
  const [explainTopicName, setExplainTopicName] = useState('');
  const [explanationOutput, setExplanationOutput] = useState('');

  // 3. Quiz Simulator State
  const [quizSubjectId, setQuizSubjectId] = useState('');
  const [quizTopicName, setQuizTopicName] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [answersChecked, setAnswersChecked] = useState([]); // indices of answered questions

  // 4. Comparison State
  const [compareExamId, setCompareExamId] = useState('');
  const [comparisonOutput, setComparisonOutput] = useState('');

  // 5. Study Planner State
  const [planOutput, setPlanOutput] = useState('');

  // Update sub-tab if prop changes
  useEffect(() => {
    if (defaultSubTab) {
      setSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Load syllabus and active exams list on load
  useEffect(() => {
    const loadInit = async () => {
      try {
        const sylRes = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics`, {
          headers: getHeaders()
        });
        if (sylRes.ok) {
          const sylData = await sylRes.json();
          setSyllabus(sylData);
          if (sylData.length > 0) {
            setExplainSubjectId(sylData[0].id);
            setQuizSubjectId(sylData[0].id);
            if (sylData[0].topics.length > 0) {
              setExplainTopicName(sylData[0].topics[0].name);
              setQuizTopicName(sylData[0].topics[0].name);
            }
          }
        }

        const registryRes = await fetch(`${backendUrl}/api/exams`, {
          headers: getHeaders()
        });
        if (registryRes.ok) {
          const regData = await registryRes.json();
          setExamsRegistry(regData.filter(e => e.id !== activeExamDetails?.id));
        }
      } catch (err) {
        console.error('Error loading AI dependencies:', err);
      }
    };
    if (userExamId) {
      loadInit();
    }
  }, [userExamId, backendUrl, activeExamDetails]);

  // Handle external topic activation
  useEffect(() => {
    if (initialTopic && syllabus.length > 0) {
      // Find which subject this topic belongs to
      let foundSubject = null;
      for (const subj of syllabus) {
        const match = subj.topics.find(t => t.name === initialTopic);
        if (match) {
          foundSubject = subj;
          break;
        }
      }

      if (foundSubject) {
        if (subTab === 'explain') {
          setExplainSubjectId(foundSubject.id);
          setExplainTopicName(initialTopic);
          handleTriggerExplain(initialTopic);
        } else if (subTab === 'quiz') {
          setQuizSubjectId(foundSubject.id);
          setQuizTopicName(initialTopic);
          handleTriggerQuiz(initialTopic);
        }
      }
    }
  }, [initialTopic, syllabus, subTab]);

  // Scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getTopicOptions = (subjectId) => {
    const subject = syllabus.find(s => s.id === subjectId);
    return subject?.topics || [];
  };

  // 1. CHAT BUDGET SUBMIT
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = { role: 'user', text: chatMessage };
    setChatHistory(prev => [...prev, userMsg]);
    setChatMessage('');
    setLoading(true);

    // Calculate quick progress stats
    let totalCount = 0;
    let doneCount = 0;
    syllabus.forEach(s => {
      totalCount += s.topics.length;
      doneCount += s.topics.filter(t => t.done).length;
    });

    try {
      const res = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: userMsg.text,
          history: chatHistory.slice(-10), // send last 10 exchanges
          examName: activeExamDetails?.exam_name || activeExamDetails?.name,
          categoryName: activeExamDetails?.exam_slug || activeExamDetails?.slug,
          targetDate: activeExamDetails?.target_date,
          progressStats: {
            totalCount,
            doneCount,
            dailyGoalHrs: activeExamDetails?.daily_goal_hrs
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        throw new Error('AI buddy had an issue replying.');
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: `Sorry, I'm having connection issues: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // 2. TRIGGER EXPLAIN
  const handleTriggerExplain = async (overrideTopic) => {
    const topicToQuery = overrideTopic || explainTopicName;
    if (!topicToQuery) return;
    setLoading(true);
    setExplanationOutput('');

    try {
      const res = await fetch(`${backendUrl}/api/ai/explain`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          topic: topicToQuery,
          examSlug: activeExamDetails?.exam_slug || activeExamDetails?.slug,
          examName: activeExamDetails?.exam_name || activeExamDetails?.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        setExplanationOutput(data.explanation);
      }
    } catch (err) {
      setExplanationOutput('Error fetching explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. TRIGGER QUIZ
  const handleTriggerQuiz = async (overrideTopic) => {
    const topicToQuery = overrideTopic || quizTopicName;
    if (!topicToQuery) return;
    setLoading(true);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setQuizScore(0);
    setAnswersChecked([]);

    try {
      const res = await fetch(`${backendUrl}/api/ai/questions`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          topic: topicToQuery,
          examSlug: activeExamDetails?.exam_slug || activeExamDetails?.slug,
          examName: activeExamDetails?.exam_name || activeExamDetails?.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx) => {
    if (answersChecked.includes(currentQuestionIdx)) return; // already answered
    setSelectedOptionIdx(idx);
    setAnswersChecked([...answersChecked, currentQuestionIdx]);

    const correctIdx = quizQuestions[currentQuestionIdx].answerIndex;
    if (idx === correctIdx) {
      setQuizScore(prev => prev + 1);
    }
  };

  // 4. TRIGGER COMPARE EXAMS
  const handleTriggerCompare = async () => {
    if (!compareExamId) return;
    setLoading(true);
    setComparisonOutput('');

    const targetExam = examsRegistry.find(e => e.id === compareExamId);

    try {
      // Fetch syllabus for comparison exam
      const otherSylRes = await fetch(`${backendUrl}/api/exams/${targetExam.slug}/syllabus`, {
        headers: getHeaders()
      });
      const otherSyl = await otherSylRes.json();
      
      const flatTopicsA = [];
      syllabus.forEach(s => s.topics.forEach(t => flatTopicsA.push({ topic: t.name, subject_name: s.name })));
      
      const flatTopicsB = [];
      otherSyl.forEach(s => s.topics.forEach(t => flatTopicsB.push({ topic: t.topic, subject_name: s.name })));

      const res = await fetch(`${backendUrl}/api/ai/compare-exams`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          examA: { name: activeExamDetails?.exam_name || activeExamDetails?.name, subjects: (activeExamDetails?.subjects || []).map(s => s.name) },
          examB: { name: targetExam.name, subjects: targetExam.tiers ? JSON.parse(targetExam.tiers).map(t => t.name) : [] },
          topicsA: flatTopicsA,
          topicsB: flatTopicsB
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComparisonOutput(data.comparison);
      }
    } catch (err) {
      console.error(err);
      setComparisonOutput('Error comparing syllabi.');
    } finally {
      setLoading(false);
    }
  };

  // 5. TRIGGER PLAN
  const handleTriggerPlan = async () => {
    setLoading(true);
    setPlanOutput('');

    let totalCount = 0;
    let doneCount = 0;
    syllabus.forEach(s => {
      totalCount += s.topics.length;
      doneCount += s.topics.filter(t => t.done).length;
    });

    const target = activeExamDetails?.target_date;
    const remainingDays = target ? Math.max(1, Math.ceil((new Date(target) - new Date()) / (1000 * 60 * 60 * 24))) : 90;

    try {
      const res = await fetch(`${backendUrl}/api/ai/plan`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          examName: activeExamDetails?.exam_name || activeExamDetails?.name,
          targetDate: target || '90 days from now',
          dailyGoalHours: activeExamDetails?.daily_goal_hrs,
          remainingDays,
          progressStats: { totalCount, doneCount }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPlanOutput(data.plan);
      }
    } catch (err) {
      console.error(err);
      setPlanOutput('Error creating study schedule.');
    } finally {
      setLoading(false);
    }
  };

  // Subject change triggers first topic selection
  const handleExplainSubjectChange = (id) => {
    setExplainSubjectId(id);
    const tops = getTopicOptions(id);
    if (tops.length > 0) setExplainTopicName(tops[0].name);
  };

  const handleQuizSubjectChange = (id) => {
    setQuizSubjectId(id);
    const tops = getTopicOptions(id);
    if (tops.length > 0) setQuizTopicName(tops[0].name);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Sub tabs */}
      <div className="ai-tabs">
        <div className={`ai-tab ${subTab === 'buddy' ? 'active' : ''}`} onClick={() => setSubTab('buddy')}>
          <i className="ti ti-message-chatbot" style={{ marginRight: '0.4rem' }}></i> Study Coach Chat
        </div>
        <div className={`ai-tab ${subTab === 'explain' ? 'active' : ''}`} onClick={() => setSubTab('explain')}>
          <i className="ti ti-school" style={{ marginRight: '0.4rem' }}></i> Explain Topic
        </div>
        <div className={`ai-tab ${subTab === 'quiz' ? 'active' : ''}`} onClick={() => setSubTab('quiz')}>
          <i className="ti ti-device-gamepad-2" style={{ marginRight: '0.4rem' }}></i> MCQ Quiz Simulator
        </div>
        <div className={`ai-tab ${subTab === 'compare' ? 'active' : ''}`} onClick={() => setSubTab('compare')}>
          <i className="ti ti-columns" style={{ marginRight: '0.4rem' }}></i> Overlap Engine
        </div>
        <div className={`ai-tab ${subTab === 'plan' ? 'active' : ''}`} onClick={() => setSubTab('plan')}>
          <i className="ti ti-calendar" style={{ marginRight: '0.4rem' }}></i> Study Planner
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        
        {/* Loading Spinner Overlap */}
        {loading && subTab !== 'buddy' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,13,22,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
            <div style={{ textAlign: 'center' }}>
              <i className="ti ti-loader-3" style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', color: 'var(--accent)', display: 'block', margin: '0 auto 1rem' }}></i>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Consulting AI Engine...</span>
            </div>
          </div>
        )}

        {/* 1. CHAT BUDDY TAB */}
        {subTab === 'buddy' && (
          <div className="chat-box">
            <div className="chat-messages">
              {chatHistory.map((h, idx) => (
                <div key={idx} className={`chat-msg ${h.role}`}>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>{h.text}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-msg assistant" style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="ti ti-loader-3" style={{ animation: 'spin 1.5s linear infinite' }}></i>
                  Typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="chat-input-bar">
              <input
                type="text"
                className="form-input"
                placeholder="Ask me to explain formulas, create a schedule, or test your memory..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1rem' }} disabled={loading}>
                <i className="ti ti-send"></i>
              </button>
            </form>
          </div>
        )}

        {/* 2. EXPLAIN TOPIC TAB */}
        {subTab === 'explain' && (
          <div style={{ minHeight: '350px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject</label>
                <select className="form-select" value={explainSubjectId} onChange={(e) => handleExplainSubjectChange(e.target.value)}>
                  {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Topic</label>
                <select className="form-select" value={explainTopicName} onChange={(e) => setExplainTopicName(e.target.value)}>
                  {getTopicOptions(explainSubjectId).map((t, idx) => (
                    <option key={idx} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleTriggerExplain()}>
                  Generate Explanation <i className="ti ti-sparkles"></i>
                </button>
              </div>
            </div>

            {explanationOutput && (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', maxHeight: '400px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{explanationOutput}</div>
              </div>
            )}
            {!explanationOutput && !loading && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>
                <i className="ti ti-sparkles" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}></i>
                Select a topic above to generate a customized explanation based on the {activeExamDetails?.name} pattern.
              </div>
            )}
          </div>
        )}

        {/* 3. MCQ PRACTICE TAB */}
        {subTab === 'quiz' && (
          <div style={{ minHeight: '350px' }}>
            {quizQuestions.length === 0 ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Subject</label>
                    <select className="form-select" value={quizSubjectId} onChange={(e) => handleQuizSubjectChange(e.target.value)}>
                      {syllabus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Topic</label>
                    <select className="form-select" value={quizTopicName} onChange={(e) => setQuizTopicName(e.target.value)}>
                      {getTopicOptions(quizSubjectId).map((t, idx) => (
                        <option key={idx} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleTriggerQuiz()}>
                      Generate Practice Quiz <i className="ti ti-device-gamepad-2"></i>
                    </button>
                  </div>
                </div>

                {!loading && (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>
                    <i className="ti ti-help" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}></i>
                    Generate 3 realistic MCQs matched to the difficulty level of the {activeExamDetails?.name} syllabus.
                  </div>
                )}
              </div>
            ) : (
              /* Quiz interactive panel */
              <div className="mcq-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Question <strong>{currentQuestionIdx + 1}</strong> of <strong>{quizQuestions.length}</strong>
                  </span>
                  <span style={{ fontSize: '0.85rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Score: <strong>{quizScore}</strong>
                  </span>
                </div>

                <div className="mcq-card">
                  <div className="mcq-question">{quizQuestions[currentQuestionIdx].question}</div>
                  
                  <div className="mcq-options">
                    {quizQuestions[currentQuestionIdx].options.map((opt, idx) => {
                      const isAnswered = answersChecked.includes(currentQuestionIdx);
                      const correctIdx = quizQuestions[currentQuestionIdx].answerIndex;
                      
                      let optClass = '';
                      if (isAnswered) {
                        if (idx === correctIdx) optClass = 'correct';
                        else if (idx === selectedOptionIdx) optClass = 'incorrect';
                      } else if (idx === selectedOptionIdx) {
                        optClass = 'selected-neutral';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`mcq-option ${optClass}`}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isAnswered}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {answersChecked.includes(currentQuestionIdx) && (
                    <div className="mcq-explanation" style={{ animation: 'slideUp 0.15s' }}>
                      <strong>Solution Explanation:</strong>
                      <div style={{ marginTop: '0.25rem' }}>
                        {quizQuestions[currentQuestionIdx].explanation}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setQuizQuestions([])}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Reset Quiz
                  </button>

                  {currentQuestionIdx < quizQuestions.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      disabled={!answersChecked.includes(currentQuestionIdx)}
                      onClick={() => {
                        setCurrentQuestionIdx(currentQuestionIdx + 1);
                        setSelectedOptionIdx(null);
                      }}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Next Question <i className="ti ti-arrow-right"></i>
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={!answersChecked.includes(currentQuestionIdx)}
                      onClick={() => {
                        alert(`Quiz completed! You scored ${quizScore} out of ${quizQuestions.length}.`);
                        setQuizQuestions([]);
                      }}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Finish Quiz
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. SYLLABUS COMPARISON TAB */}
        {subTab === 'compare' && (
          <div style={{ minHeight: '350px' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                <label className="form-label">Compare {activeExamDetails?.name} With:</label>
                <select className="form-select" value={compareExamId} onChange={(e) => setCompareExamId(e.target.value)}>
                  <option value="">-- Choose Exam from Registry --</option>
                  {examsRegistry.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.full_name})</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleTriggerCompare} disabled={!compareExamId}>
                Compare Overlap <i className="ti ti-columns"></i>
              </button>
            </div>

            {comparisonOutput ? (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', maxHeight: '400px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{comparisonOutput}</div>
              </div>
            ) : (
              !loading && (
                <div style={{ textAlign: 'center', padding: '4.5rem', color: 'var(--text-tertiary)' }}>
                  <i className="ti ti-zoom-check" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}></i>
                  Identify shared subjects and topics between exams. If you mark a topic done in one exam, it automatically marks it done in the other!
                </div>
              )
            )}
          </div>
        )}

        {/* 5. STUDY PLANNER TAB */}
        {subTab === 'plan' && (
          <div style={{ minHeight: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Adaptive Revision Planner</h4>
                <p style={{ fontSize: '0.78rem' }}>Generates daily timetables mapping remaining topics to target date.</p>
              </div>
              <button className="btn btn-primary" onClick={handleTriggerPlan}>
                Create Study Plan <i className="ti ti-calendar-event"></i>
              </button>
            </div>

            {planOutput ? (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem', maxHeight: '400px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{planOutput}</div>
              </div>
            ) : (
              !loading && (
                <div style={{ textAlign: 'center', padding: '4.5rem', color: 'var(--text-tertiary)' }}>
                  <i className="ti ti-calendar" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}></i>
                  Generates an custom roadmap dividing the remaining study hours across your weak subjects and revision review cycles.
                </div>
              )
            )}
          </div>
        )}

      </div>

    </div>
  );
}
