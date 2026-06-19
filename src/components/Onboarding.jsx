import React, { useState, useEffect } from 'react';

export default function Onboarding({ onComplete, backendUrl }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [targetDate, setTargetDate] = useState('');
  const [dailyGoalHrs, setDailyGoalHrs] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories on load
  useEffect(() => {
    fetch(`${backendUrl}/api/exams/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, [backendUrl]);

  // Fetch exams when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetch(`${backendUrl}/api/exams?category=${selectedCategory.slug}`)
        .then(res => res.json())
        .then(data => setExams(data))
        .catch(err => console.error('Error fetching exams:', err));
    }
  }, [selectedCategory, backendUrl]);

  const handleNextStep = () => {
    if (step === 1 && (!name || !email)) {
      setError('Please fill in your name and email');
      return;
    }
    if (step === 2 && !selectedCategory) {
      setError('Please choose an exam category');
      return;
    }
    if (step === 3 && !selectedExam) {
      setError('Please select an exam to start with');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/api/users/me/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExam.id,
          targetDate,
          dailyGoalHrs: parseFloat(dailyGoalHrs)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll in exam');
      }

      // Save user details to localStorage
      localStorage.setItem('user_name', name);
      localStorage.setItem('user_email', email);

      onComplete(data.userExamId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container container">
      <div className="onboarding-card glass-panel">
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>
          Welcome to ProgressPad
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Let's set up your competitive exam board and study calendar.
        </p>

        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
          <div className={`step-dot ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>4</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="step-content">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Create your local profile</h3>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={handleNextStep}>
                Next <i className="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Category Selection */}
        {step === 2 && (
          <div className="step-content">
            <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem' }}>Choose your exam vertical</h3>
            <div className="selection-grid">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`selection-card ${selectedCategory?.id === cat.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <i className={`ti ${cat.icon || 'ti-school'}`}></i>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                <i className="ti ti-arrow-left"></i> Back
              </button>
              <button className="btn btn-primary" onClick={handleNextStep}>
                Next <i className="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Exam Picker */}
        {step === 3 && (
          <div className="step-content">
            <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem' }}>
              Select target exam for {selectedCategory?.label}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {exams.map((ex) => (
                <div
                  key={ex.id}
                  className={`selection-card ${selectedExam?.id === ex.id ? 'selected' : ''}`}
                  onClick={() => setSelectedExam(ex)}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'left', padding: '1rem', gap: '1rem' }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-checklist" style={{ fontSize: '1.25rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.full_name}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {ex.conducting_body}
                  </div>
                </div>
              ))}
              {exams.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                  No exams loaded for this category.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                <i className="ti ti-arrow-left"></i> Back
              </button>
              <button className="btn btn-primary" onClick={handleNextStep}>
                Next <i className="ti ti-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Goals & Dates */}
        {step === 4 && (
          <form className="step-content" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem' }}>
              Study parameters for {selectedExam?.name}
            </h3>
            <div className="form-group">
              <label className="form-label">Target Exam Date</label>
              <input
                type="date"
                className="form-input"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Study Goal (Hours)</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                className="form-input"
                required
                value={dailyGoalHrs}
                onChange={(e) => setDailyGoalHrs(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handlePrevStep}>
                <i className="ti ti-arrow-left"></i> Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Setting up board...' : 'Load Syllabus Dashboard'} <i className="ti ti-rocket"></i>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
