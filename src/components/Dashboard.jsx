import React, { useState, useEffect, useMemo } from 'react';

export default function Dashboard({ userExamId, backendUrl, onSwitchToAIExplain, onSwitchToAIQuiz, mobileView }) {
  const [syllabus, setSyllabus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [revisionDue, setRevisionDue] = useState([]);
  const [nextUpList, setNextUpList] = useState([]);

  // Per-board filter state: { [subjectId]: { status: 'All', priority: 'All', search: '' } }
  const [boardFilters, setBoardFilters] = useState({});

  // Custom Topic Modal State
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicSection, setNewTopicSection] = useState('');
  const [newTopicSubjectId, setNewTopicSubjectId] = useState('');
  const [newTopicPriority, setNewTopicPriority] = useState('Medium');
  const [newTopicResource, setNewTopicResource] = useState('');
  const [newTopicDiff, setNewTopicDiff] = useState('medium');
  const [customModalSubject, setCustomModalSubject] = useState(null);

  // Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempDone, setTempDone] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [tempRating, setTempRating] = useState(0);
  const [saveLoading, setSaveLoading] = useState(false);

  // Flashcard Modal State
  const [fcOpen, setFcOpen] = useState(false);
  const [fcTitle, setFcTitle] = useState('');
  const [fcSection, setFcSection] = useState('');
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcCards, setFcCards] = useState([]);
  const [fcLoading, setFcLoading] = useState(false);

  // ── Local flashcard library (used when backend is unavailable) ──
  const LOCAL_FC = {
    'Kinematics': [
      { front: 'Equations of Motion', back: 'v = u + at\ns = ut + ½at²\nv² = u² + 2as\nsₙ = u + a(2n−1)/2', type: 'formula' },
      { front: 'Projectile Motion', back: 'Range: R = u²sin2θ/g\nMax Range at θ=45°: R = u²/g\nTime of flight: T = 2u sinθ/g\nMax height: H = u²sin²θ/2g', type: 'formula' },
      { front: 'Graphs Quick Reference', back: 'x-t slope → velocity\nv-t slope → acceleration\nv-t area → displacement\na-t area → Δvelocity', type: 'concept' },
    ],
    'Newton\'s Laws': [
      { front: 'Three Laws Summary', back: '1st: Inertia law\n2nd: F = ma\n3rd: Action = Reaction', type: 'concept' },
      { front: 'Friction Formulas', back: 'f_s ≤ μ_s N  |  f_k = μ_k N\nμ_s > μ_k always\ntan φ = μ (angle of friction)', type: 'formula' },
    ],
    'Thermodynamics': [
      { front: 'Laws of Thermodynamics', back: '0th: Thermal equilibrium\n1st: ΔU = Q − W\n2nd: Entropy always increases\n3rd: S→0 as T→0 K', type: 'concept' },
      { front: 'Ideal Gas Processes', back: 'Isothermal: PV = const\nAdiabatic: PVγ = const\nIsobaric: V/T = const\nIsochoric: P/T = const', type: 'formula' },
    ],
    'Electrostatics': [
      { front: 'Coulomb\'s Law', back: 'F = kq₁q₂/r²\nk = 9×10⁹ N·m²/C²\nε₀ = 8.85×10⁻¹² C²/N·m²', type: 'formula' },
      { front: 'Capacitance', back: 'C = Q/V\nParallel plate: C = ε₀A/d\nSeries: 1/C = Σ1/Cᵢ\nParallel: C = ΣCᵢ\nEnergy: U = ½CV²', type: 'formula' },
    ],
    'Optics': [
      { front: 'Mirror & Lens Formula', back: 'Mirror: 1/v + 1/u = 1/f, f = R/2\nLens: 1/v − 1/u = 1/f\nMagnification: m = −v/u', type: 'formula' },
      { front: 'Snell\'s Law & TIR', back: 'n₁sinθ₁ = n₂sinθ₂\nTIR: sinθ_c = n₂/n₁ (n₁>n₂)\nn = real depth/apparent depth', type: 'formula' },
    ],
    'Modern Physics': [
      { front: 'Photoelectric Effect', back: 'E = hν = hc/λ\nKE_max = hν − φ\nThreshold: ν₀ = φ/h\nStopping potential: eV₀ = KE_max', type: 'formula' },
      { front: 'Radioactivity', back: 'N = N₀e^(−λt)\nT½ = 0.693/λ\nActivity: A = λN', type: 'formula' },
    ],
    'Mole Concept': [
      { front: 'Mole Relationships', back: '1 mole = 6.022×10²³ particles\nMoles = Mass/Molar mass\nMoles = Vol(STP)/22.4 L', type: 'formula' },
      { front: 'Concentration Terms', back: 'Molarity M = mol/L solution\nMolality m = mol/kg solvent\nNormality N = M × n-factor', type: 'formula' },
    ],
    'Chemical Equilibrium': [
      { front: 'Equilibrium Constant', back: 'Kc = [P]^p/[R]^r\nKp = Kc(RT)^Δn\nΔn = Δmoles of gas', type: 'formula' },
      { front: 'pH and pOH', back: 'pH = −log[H⁺]\npOH = −log[OH⁻]\npH + pOH = 14\nKw = 10⁻¹⁴', type: 'formula' },
    ],
    'Organic Chemistry': [
      { front: 'Reaction Types', back: 'SN1: 3° substrate, racemization\nSN2: 1° substrate, inversion\nE1: 3°, Zaitsev product\nE2: Anti-periplanar, strong base', type: 'concept' },
      { front: 'Named Reactions', back: 'Aldol: β-hydroxy carbonyl\nCannizzaro: non-enolizable aldehyde\nClemmensen: C=O→CH₂ (Zn-Hg/HCl)\nWolff-Kishner: C=O→CH₂ (N₂H₄/KOH)', type: 'mnemonic' },
    ],
    'p-Block Elements': [
      { front: 'Group 13 (Boron family)', back: 'B, Al, Ga, In, Tl\nBoron: non-metal; others metals\nBF₃: Lewis acid (empty p orbital)\nAluminium: amphoteric oxide', type: 'concept' },
      { front: 'Group 14 (Carbon family)', back: 'C, Si, Ge, Sn, Pb\nSiO₂: giant covalent (acidic)\nPb forms stable Pb²⁺ (inert pair)\nAllotropes of C: diamond, graphite, fullerene', type: 'concept' },
      { front: 'Group 15 (Nitrogen family)', back: 'N, P, As, Sb, Bi\nN₂: very stable (triple bond)\nHNO₃: strong oxidising acid\nPhosphorus: white, red, black allotropes', type: 'concept' },
      { front: 'Group 16 (Chalcogens)', back: 'O, S, Se, Te, Po\nSO₂: acidic, reducing agent\nSO₃ + H₂O → H₂SO₄\nO₃ (ozone): oxidising, decomposes at high T', type: 'concept' },
      { front: 'Group 17 (Halogens)', back: 'F, Cl, Br, I, At\nReactivity: F > Cl > Br > I\nF has no d-orbital → no expanded octet\nHF: weak acid (H-bond); HCl,HBr,HI: strong acids', type: 'concept' },
      { front: 'Group 18 (Noble Gases)', back: 'He, Ne, Ar, Kr, Xe, Rn\nXe forms compounds: XeF₂, XeF₄, XeO₃\nHe: lowest BP, used in cryogenics\nAr: most abundant noble gas in air', type: 'concept' },
    ],
    'Percentage': [
      { front: 'Core Percentage Formulas', back: 'X% of Y = XY/100\n%↑ = (increase/original)×100\n%↓ = (decrease/original)×100\nSuccessive: A+B+AB/100', type: 'formula' },
      { front: 'Fraction↔Percent', back: '½=50%, ⅓=33.3%, ¼=25%, ⅕=20%\n⅙=16.7%, ⅛=12.5%, 1/10=10%', type: 'mnemonic' },
    ],
    'Probability': [
      { front: 'Basic Rules', back: 'P(A) = favourable/total\nP(A∪B) = P(A)+P(B)−P(A∩B)\nP(A|B) = P(A∩B)/P(B)\nP(Ā) = 1−P(A)', type: 'formula' },
      { front: 'nPr and nCr', back: 'nPr = n!/(n−r)!\nnCr = n!/[r!(n−r)!]\nnCr = nCn−r', type: 'formula' },
    ],
    'Cell Biology': [
      { front: 'Organelle Functions', back: 'Mitochondria → ATP\nRibosome → Protein synthesis\nGolgi → Packaging/secretion\nLysosome → Intracellular digestion\nChloroplast → Photosynthesis', type: 'concept' },
      { front: 'Cell Division Mnemonic', back: 'PMAT: Prophase→Metaphase→Anaphase→Telophase\nMitosis: 2 diploid cells\nMeiosis: 4 haploid cells (gametes)', type: 'mnemonic' },
    ],
    'Genetics': [
      { front: 'Mendel\'s Laws', back: '1. Segregation: alleles separate in gametes\n2. Independent Assortment: genes sort independently\nTest cross: with homozygous recessive', type: 'concept' },
      { front: 'DNA Replication', back: 'Semi-conservative\nLeading strand: continuous\nLagging strand: Okazaki fragments\nKey enzymes: Helicase, DNA Pol III, Ligase', type: 'concept' },
    ],
  };

  const getLocalFlashcards = (topicName) => {
    const exact = LOCAL_FC[topicName];
    if (exact) return exact;
    const key = Object.keys(LOCAL_FC).find(k =>
      topicName.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(topicName.toLowerCase())
    );
    if (key) return LOCAL_FC[key];
    return [
      { front: `Key Points — ${topicName}`, back: '📌 Understand the core definition\n📌 Note formulas and special cases\n📌 Practice with PYQs from last 5 years\n📌 Connect to related topics', type: 'concept' },
      { front: `Exam Strategy — ${topicName}`, back: '⚡ ~1.5 min per MCQ\n⚡ Eliminate wrong options first\n⚡ Check units in numerical problems\n⚡ Draw diagrams where applicable', type: 'mnemonic' },
    ];
  };

  const openFlashcards = async (topicId, topicName, section) => {
    setFcTitle(topicName);
    setFcSection(section || '');
    setFcIndex(0);
    setFcFlipped(false);
    setFcCards([]);
    setFcLoading(true);
    setFcOpen(true);
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics/${topicId}/flashcards`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const cards = data.cards && data.cards.length > 0 ? data.cards : getLocalFlashcards(topicName);
      setFcCards(cards);
    } catch {
      // Fallback to local library — always works offline
      setFcCards(getLocalFlashcards(topicName));
    } finally {
      setFcLoading(false);
    }
  };

  const fetchSyllabus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics`);
      if (!res.ok) throw new Error('Failed to load syllabus');
      const data = await res.json();
      setSyllabus(data);
      if (data.length > 0 && !newTopicSubjectId) {
        setNewTopicSubjectId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRevisionDue = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/revision-due`);
      if (res.ok) { const data = await res.json(); setRevisionDue(data); }
    } catch {}
  };

  const fetchNextUp = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/next-up`);
      if (res.ok) { const data = await res.json(); setNextUpList(data); }
    } catch {}
  };

  useEffect(() => {
    if (userExamId) {
      setLoading(true);
      Promise.all([fetchSyllabus(), fetchRevisionDue(), fetchNextUp()]).finally(() => setLoading(false));
    }
  }, [userExamId, backendUrl]);

  // Initialize filters for new subjects
  useEffect(() => {
    const init = {};
    syllabus.forEach(s => {
      if (!boardFilters[s.id]) init[s.id] = { status: 'All', priority: 'All', search: '' };
    });
    if (Object.keys(init).length > 0) setBoardFilters(prev => ({ ...prev, ...init }));
  }, [syllabus]);

  const handleToggleDone = async (topicId, currentDone, currentStatus) => {
    const nextDone = !currentDone;
    const nextStatus = nextDone ? 'Done' : (currentStatus === 'Done' ? 'In Progress' : currentStatus);
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: nextDone, status: nextStatus })
      });
      if (res.ok) { fetchSyllabus(); fetchRevisionDue(); fetchNextUp(); }
    } catch {}
  };

  const handleOpenDetail = (topic) => {
    setSelectedTopic(topic);
    setTempStatus(topic.status || 'Not Started');
    setTempDone(!!topic.done);
    setTempNotes(topic.notes || '');
    setTempRating(topic.difficulty_rating || 0);
    setDetailModalOpen(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedTopic) return;
    setSaveLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics/${selectedTopic.topic_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: tempStatus, done: tempDone, notes: tempNotes, difficultyRating: tempRating > 0 ? tempRating : undefined })
      });
      if (res.ok) { setDetailModalOpen(false); fetchSyllabus(); fetchRevisionDue(); fetchNextUp(); }
    } catch {} finally { setSaveLoading(false); }
  };

  const handleOpenAddTopic = (subj) => {
    setCustomModalSubject(subj);
    setNewTopicSubjectId(subj.id);
    setCustomModalOpen(true);
  };

  const handleAddCustomTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName || !newTopicSubjectId) return;
    try {
      const res = await fetch(`${backendUrl}/api/user-exams/${userExamId}/topics/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: newTopicSubjectId, section: newTopicSection, topic: newTopicName, priority: newTopicPriority, recommendedResource: newTopicResource, difficulty: newTopicDiff })
      });
      if (res.ok) { setCustomModalOpen(false); setNewTopicName(''); setNewTopicSection(''); setNewTopicResource(''); fetchSyllabus(); fetchNextUp(); }
    } catch {}
  };

  const setFilter = (subjectId, key, value) => {
    setBoardFilters(prev => ({ ...prev, [subjectId]: { ...(prev[subjectId] || {}), [key]: value } }));
  };

  // Compute global stats
  const globalStats = useMemo(() => {
    let totalTopics = 0, doneTopics = 0, activeTopics = 0;
    const subjectStats = {};
    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    const priorityDone = { High: 0, Medium: 0, Low: 0 };

    syllabus.forEach(subj => {
      const done = subj.topics.filter(t => t.done).length;
      const inProgress = subj.topics.filter(t => !t.done && t.status === 'In Progress').length;
      totalTopics += subj.topics.length;
      doneTopics += done;
      activeTopics += inProgress;
      subjectStats[subj.id] = { name: subj.name, color: subj.color, done, total: subj.topics.length };
      subj.topics.forEach(t => {
        const pri = t.priority || 'Medium';
        if (priorityCounts[pri] !== undefined) {
          priorityCounts[pri]++;
          if (t.done) priorityDone[pri]++;
        }
      });
    });
    const pct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;
    return { totalTopics, doneTopics, activeTopics, pct, subjectStats: Object.values(subjectStats), priorityCounts, priorityDone };
  }, [syllabus]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#3b82f6';
      default: return 'var(--text-tertiary)';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
      case 'In Progress': return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
      case 'Revision': return { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' };
      default: return { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' };
    }
  };

  const getFilteredTopics = (subj) => {
    const f = boardFilters[subj.id] || { status: 'All', priority: 'All', search: '' };
    return subj.topics.filter(t => {
      if (f.status !== 'All' && t.status !== f.status) return false;
      if (f.priority !== 'All' && t.priority !== f.priority) return false;
      if (f.search && !t.name.toLowerCase().includes(f.search.toLowerCase()) && !(t.section || '').toLowerCase().includes(f.search.toLowerCase())) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <i className="ti ti-loader-3" style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', color: 'var(--accent)' }}></i>
          <span style={{ color: 'var(--text-secondary)' }}>Loading exam syllabus...</span>
        </div>
      </div>
    );
  }

  // Progress ring SVG calc
  const RING_R = 52;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;
  const ringDash = RING_CIRCUMFERENCE - (globalStats.pct / 100) * RING_CIRCUMFERENCE;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>

      {/* TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-layout-kanban" style={{ color: 'var(--accent)' }}></i>
            Syllabus Boards
          </h2>
          <p style={{ fontSize: '0.82rem' }}>Tick topics to mark complete · Click status pills to log notes & calibrate revision.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.2rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', background: viewMode === 'board' ? 'var(--accent)' : 'transparent', color: viewMode === 'board' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '6px' }}
              onClick={() => setViewMode('board')}
            >
              <i className="ti ti-table"></i> Boards
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', background: viewMode === 'srs' ? 'var(--accent)' : 'transparent', color: viewMode === 'srs' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '6px' }}
              onClick={() => setViewMode('srs')}
            >
              <i className="ti ti-history"></i> Revision ({revisionDue.length})
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => { setCustomModalSubject(syllabus[0] || null); setNewTopicSubjectId(syllabus[0]?.id || ''); setCustomModalOpen(true); }} style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
            <i className="ti ti-plus"></i> Custom Topic
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* ===== WORKSPACE LAYOUT: LEFT SIDEBAR + RIGHT BOARDS GRID ===== */
        <div className={`workspace-layout mobile-view-${mobileView}`}>

          {/* ---- LEFT SIDEBAR ---- */}
          <aside className="ws-sidebar">

            {/* OVERALL PROGRESS */}
            <div className="glass-panel ws-sidebar-card" style={{ animation: 'sidebarSlideIn 0.4s ease-out both', animationDelay: '0.05s' }}>
              <div className="ws-sidebar-title">
                <i className="ti ti-chart-donut" style={{ color: 'var(--accent)' }}></i>
                OVERALL PROGRESS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r={RING_R} fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                  <circle
                    cx="65" cy="65" r={RING_R}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringDash}
                    transform="rotate(-90 65 65)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out', filter: 'drop-shadow(0 0 6px var(--accent))' }}
                  />
                  <text x="65" y="61" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700" fontFamily="var(--font-display)">{globalStats.pct}%</text>
                  <text x="65" y="76" textAnchor="middle" fill="var(--text-tertiary)" fontSize="8.5" fontFamily="var(--font-sans)" letterSpacing="1">COMPLETED</text>
                </svg>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: '100%', marginTop: '0.5rem', textAlign: 'center' }}>
                  {[
                    { label: 'DONE', val: globalStats.doneTopics, color: '#10b981', delay: '0.5s' },
                    { label: 'ACTIVE', val: globalStats.activeTopics, color: '#f59e0b', delay: '0.6s' },
                    { label: 'TOTAL', val: globalStats.totalTopics, color: 'var(--text-secondary)', delay: '0.7s' }
                  ].map(s => (
                    <div key={s.label} style={{ animation: 'countUp 0.5s ease-out both', animationDelay: s.delay }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: s.color, fontFamily: 'var(--font-display)' }}>{s.val}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginTop: '1px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SUBJECTS PERFORMANCE */}
            <div className="glass-panel ws-sidebar-card" style={{ animation: 'sidebarSlideIn 0.4s ease-out both', animationDelay: '0.12s' }}>
              <div className="ws-sidebar-title">
                <i className="ti ti-list-check" style={{ color: 'var(--accent)' }}></i>
                SUBJECTS PERFORMANCE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.75rem' }}>
                {globalStats.subjectStats.map(s => {
                  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
                  return (
                    <div key={s.name} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, color: s.color }}>{s.name}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>{s.done}/{s.total} · {pct}%</span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '99px', background: 'var(--bg-tertiary)' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '99px', transition: 'width 0.6s ease-out', boxShadow: `0 0 4px ${s.color}60` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRIORITY BREAKDOWN */}
            <div className="glass-panel ws-sidebar-card" style={{ animation: 'sidebarSlideIn 0.4s ease-out both', animationDelay: '0.19s' }}>
              <div className="ws-sidebar-title">
                <i className="ti ti-flame" style={{ color: '#ef4444' }}></i>
                PRIORITY BREAKDOWN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                {[
                  { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
                  { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
                  { label: 'Low', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }
                ].map(p => {
                  const total = globalStats.priorityCounts[p.label] || 0;
                  const done = globalStats.priorityDone[p.label] || 0;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={p.label} style={{ background: p.bg, borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{done}/{total} ({pct}%)</span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: '99px', transition: 'width 0.6s ease-out' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRIORITY NEXT UP */}
            {nextUpList.length > 0 && (
              <div className="glass-panel ws-sidebar-card" style={{ animation: 'sidebarSlideIn 0.4s ease-out both', animationDelay: '0.26s' }}>
                <div className="ws-sidebar-title">
                  <i className="ti ti-activity" style={{ color: '#ef4444' }}></i>
                  PRIORITY NEXT-UP
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem' }}>
                  {nextUpList.slice(0, 5).map((t, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.6rem', fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1px' }}>{t.topic}</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>{t.subject_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </aside>

          {/* ---- RIGHT BOARDS GRID ---- */}
          <main className="ws-boards-grid">
            {syllabus.map((subj, subjectIndex) => {
              const doneCount = subj.topics.filter(t => t.done).length;
              const totalCount = subj.topics.length;
              const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
              const f = boardFilters[subj.id] || { status: 'All', priority: 'All', search: '' };
              const filteredTopics = getFilteredTopics(subj);

              return (
                <div
                  key={subj.id}
                  className="subject-board glass-panel"
                  style={{
                    '--subject-color': subj.color,
                    animation: 'boardEntrance 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
                    animationDelay: `${subjectIndex * 0.07 + 0.1}s`
                  }}
                >

                  {/* Board Header */}
                  <div className="sb-header" style={{ background: `linear-gradient(135deg, ${subj.color}18 0%, transparent 100%)` }}>
                    <div className="sb-title">
                      <span className="sb-dot" style={{ background: subj.color, boxShadow: `0 0 6px ${subj.color}80` }}></span>
                      <span style={{ color: subj.color, fontWeight: 800 }}>{subj.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.82rem' }}> Board</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="sb-badge">{doneCount}/{totalCount} done</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: subj.color }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Board Controls Row */}
                  <div className="sb-controls">
                    <select className="sb-filter-select" value={f.status} onChange={e => setFilter(subj.id, 'status', e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                      <option value="Revision">Revision</option>
                    </select>
                    <select className="sb-filter-select" value={f.priority} onChange={e => setFilter(subj.id, 'priority', e.target.value)}>
                      <option value="All">All Priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <input
                      className="sb-search"
                      type="text"
                      placeholder="Search board..."
                      value={f.search}
                      onChange={e => setFilter(subj.id, 'search', e.target.value)}
                    />
                    <button
                      className="sb-add-btn"
                      style={{ '--subject-color': subj.color }}
                      onClick={() => handleOpenAddTopic(subj)}
                    >
                      <i className="ti ti-plus"></i> Add
                    </button>
                  </div>

                  {/* Table Wrapper for horizontal scroll on mobile */}
                  <div className="sb-table-wrapper">
                    {/* Column Header */}
                    <div className="sb-col-header">
                      <span className="sbch-check">✓</span>
                      <span className="sbch-topic">TOPIC & SECTION</span>
                      <span className="sbch-resource">RESOURCE</span>
                      <span className="sbch-pri">PRI</span>
                      <span className="sbch-status">STATUS</span>
                      <span style={{ textAlign: 'center' }}>FC</span>
                    </div>

                    {/* Scrollable Topic List */}
                    <div className="sb-list">
                      {filteredTopics.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '1.5rem', fontSize: '0.8rem' }}>
                          {subj.topics.length === 0 ? 'No topics mapped.' : 'No topics match your filters.'}
                        </div>
                      )}
                      {filteredTopics.map(topic => {
                        const statusStyle = getStatusColor(topic.status);
                        return (
                          <div key={topic.topic_id} className={`sb-row ${topic.done ? 'sb-row-done' : ''}`}>

                            {/* Checkbox */}
                            <div className="sb-row-check" onClick={e => { e.stopPropagation(); handleToggleDone(topic.topic_id, topic.done, topic.status); }}>
                              <div className={`topic-tick ${topic.done ? 'topic-tick-done' : ''}`}>
                                {topic.done && <i className="ti ti-check" style={{ fontSize: '0.65rem' }}></i>}
                              </div>
                            </div>

                            {/* Topic name + section — click opens DETAIL/INFO modal (restored) */}
                            <div
                              className="sb-row-topic"
                              onClick={() => handleOpenDetail(topic)}
                              title="Click to view topic details & AI explanation"
                            >
                              <div className="sb-topic-name">{topic.name}</div>
                              {topic.section && <div className="sb-topic-section">{topic.section}</div>}
                            </div>

                            {/* Resource */}
                            <div className="sb-row-resource">
                              {topic.recommended_resource ? (
                                <span className="sb-resource-chip" title={topic.recommended_resource}>
                                  {topic.recommended_resource.length > 14 ? topic.recommended_resource.substring(0, 13) + '…' : topic.recommended_resource}
                                </span>
                              ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>—</span>}
                            </div>

                            {/* Priority Badge */}
                            <div className="sb-row-pri">
                              <span className="pri-badge" style={{ '--pri-color': getPriorityColor(topic.priority) }}>
                                {topic.priority || 'Med'}
                              </span>
                            </div>

                            {/* Status Pill - click opens detail modal */}
                            <div className="sb-row-status" onClick={() => handleOpenDetail(topic)}>
                              <span className="status-pill" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                <span className="status-dot" style={{ background: statusStyle.color }}></span>
                                {topic.status || 'Not Started'}
                              </span>
                            </div>

                            {/* Flashcard Icon Button — separate feature */}
                            <div className="sb-row-fc" onClick={e => { e.stopPropagation(); openFlashcards(topic.topic_id, topic.name, topic.section); }} title="View Flashcards">
                              <span className="fc-row-btn">🃏</span>
                            </div>
                          </div>

                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      ) : (
        /* ===== REVISION DUE (SRS) VIEW ===== */
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'slideUp 0.2s ease-out' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-calendar-time" style={{ color: '#eab308' }}></i>
            Overdue Spaced Repetition (SRS) Reviews
          </h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            Topics you've marked done but are due for active recall testing to build long-term memory.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {revisionDue.map((t, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>{t.subject_name}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-tertiary)' }}></span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.section}</span>
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>{t.topic}</h4>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Next Review:</div>
                    <div style={{ fontWeight: 600, color: '#eab308' }}>{t.next_review_at || 'Today'}</div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => onSwitchToAIExplain(t.topic)} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                    AI Explain <i className="ti ti-external-link"></i>
                  </button>
                  <button className="btn btn-primary" onClick={() => onSwitchToAIQuiz(t.topic)} style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                    Take Quiz <i className="ti ti-device-gamepad-2"></i>
                  </button>
                </div>
              </div>
            ))}
            {revisionDue.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                <i className="ti ti-check-double" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: '#10b981' }}></i>
                No revisions due for today. Keep checking your boards!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {detailModalOpen && selectedTopic && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{selectedTopic.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{selectedTopic.subject_name} · {selectedTopic.section}</span>
              </div>
              <button onClick={() => setDetailModalOpen(false)} style={{ cursor: 'pointer', fontSize: '1.25rem' }}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Priority:</span> <strong style={{ color: getPriorityColor(selectedTopic.priority) }}>{selectedTopic.priority}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Weightage:</span> <strong>{selectedTopic.avg_weightage}%</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Difficulty:</span> <strong style={{ textTransform: 'capitalize' }}>{selectedTopic.canonical_difficulty}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Optional:</span> <strong>{selectedTopic.is_optional ? 'Yes' : 'No'}</strong></div>
                {selectedTopic.recommended_resource && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Recommended Book:</span> <strong>{selectedTopic.recommended_resource} ({selectedTopic.resource_chapter || 'Complete'})</strong>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Progress Status</label>
                <select className="form-select" value={tempStatus} onChange={e => setTempStatus(e.target.value)}>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Revision">Revision</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="modal-done-check" className="done-checkbox" checked={tempDone} onChange={e => { setTempDone(e.target.checked); if (e.target.checked && tempStatus !== 'Revision') setTempStatus('Done'); }} />
                <label htmlFor="modal-done-check" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Mark topic as completed</label>
              </div>
              {tempDone && (
                <div className="form-group" style={{ padding: '0.8rem', background: 'rgba(234,179,8,0.06)', border: '1px dashed rgba(234,179,8,0.2)', borderRadius: '8px' }}>
                  <label className="form-label" style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <i className="ti ti-star"></i> Spaced Repetition Calibration
                  </label>
                  <p style={{ fontSize: '0.75rem', marginBottom: '0.6rem' }}>How well do you remember this today? Rating sets your next revision.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1,2,3,4,5].map(val => (
                      <button type="button" key={val} onClick={() => setTempRating(val)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: tempRating >= val ? '#eab308' : 'var(--bg-tertiary)', color: tempRating >= val ? '#1e1b4b' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s' }}>{val}</button>
                    ))}
                  </div>
                  {selectedTopic.next_review_at && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Next review: <strong>{selectedTopic.next_review_at}</strong> (Ease: {selectedTopic.ease_factor?.toFixed(2) || '2.5'})
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Study Notes & Formulas</label>
                <textarea className="form-textarea" placeholder="Formulas, key concepts, or weak areas..." value={tempNotes} onChange={e => setTempNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setDetailModalOpen(false); onSwitchToAIExplain(selectedTopic.name); }} style={{ fontSize: '0.78rem', flex: 1, padding: '0.5rem' }}>
                  <i className="ti ti-sparkles" style={{ color: 'var(--accent)' }}></i> Explain with AI
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setDetailModalOpen(false); onSwitchToAIQuiz(selectedTopic.name); }} style={{ fontSize: '0.78rem', flex: 1, padding: '0.5rem' }}>
                  <i className="ti ti-device-gamepad-2" style={{ color: '#10b981' }}></i> Practice MCQs
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDetails} disabled={saveLoading}>{saveLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CUSTOM TOPIC MODAL ===== */}
      {customModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Add Custom Topic</h3>
              <button onClick={() => setCustomModalOpen(false)} style={{ cursor: 'pointer', fontSize: '1.25rem' }}><i className="ti ti-x"></i></button>
            </div>
            <form onSubmit={handleAddCustomTopic}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Board</label>
                  <select className="form-select" value={newTopicSubjectId} onChange={e => setNewTopicSubjectId(e.target.value)}>
                    {syllabus.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Topic Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Kinematics, Mole Concept" required value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Section / Chapter Group</label>
                  <input type="text" className="form-input" placeholder="e.g. Mechanics, Physical Chemistry" value={newTopicSection} onChange={e => setNewTopicSection(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Exam Priority</label>
                  <select className="form-select" value={newTopicPriority} onChange={e => setNewTopicPriority(e.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Recommended Book / Resource</label>
                  <input type="text" className="form-input" placeholder="e.g. HC Verma, NCERT Chemistry" value={newTopicResource} onChange={e => setNewTopicResource(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Syllabus Difficulty</label>
                  <select className="form-select" value={newTopicDiff} onChange={e => setNewTopicDiff(e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCustomModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== FLASHCARD MODAL ===================== */}
      {fcOpen && (
        <div
          className="fc-overlay"
          onClick={() => setFcOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') setFcOpen(false);
            if (e.key === 'ArrowRight' && fcIndex < fcCards.length - 1) { setFcIndex(i => i + 1); setFcFlipped(false); }
            if (e.key === 'ArrowLeft' && fcIndex > 0) { setFcIndex(i => i - 1); setFcFlipped(false); }
            if (e.key === ' ') { e.preventDefault(); setFcFlipped(f => !f); }
          }}
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <div className="fc-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="fc-header">
              <div className="fc-header-info">
                <h3>📚 {fcTitle}</h3>
                <p>{fcSection ? `${fcSection} ·` : ''} {fcCards.length} flashcard{fcCards.length !== 1 ? 's' : ''} · Click card to flip</p>
              </div>
              <button className="fc-close-btn" onClick={() => setFcOpen(false)}>✕</button>
            </div>

            {/* Card Scene */}
            {fcLoading ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 18, border: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading flashcards...</div>
                </div>
              </div>
            ) : fcCards.length > 0 ? (
              <div className="fc-scene" onClick={() => setFcFlipped(f => !f)}>
                <div className={`fc-card fc-type-${fcCards[fcIndex]?.type || 'concept'} ${fcFlipped ? 'flipped' : ''}`}>

                  {/* FRONT */}
                  <div className="fc-face fc-front">
                    <div className="fc-front-badge">
                      {fcCards[fcIndex]?.type === 'formula' ? '∑ Formula' : fcCards[fcIndex]?.type === 'mnemonic' ? '💡 Mnemonic' : '📖 Concept'}
                    </div>
                    <div className="fc-front-text">{fcCards[fcIndex]?.front}</div>
                    <div className="fc-flip-hint">
                      <span>↕</span> Click to reveal answer
                    </div>
                  </div>

                  {/* BACK */}
                  <div className="fc-face fc-back">
                    <div className="fc-back-text">{fcCards[fcIndex]?.back}</div>
                    <div className="fc-flip-hint">
                      <span>↕</span> Click to go back
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 18, border: '1px solid var(--border-color)', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                No flashcards available for this topic.
              </div>
            )}

            {/* Navigation */}
            {fcCards.length > 0 && (
              <div className="fc-nav">
                <button
                  className="fc-nav-btn"
                  disabled={fcIndex === 0}
                  onClick={() => { setFcIndex(i => i - 1); setFcFlipped(false); }}
                >
                  ← Prev
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div className="fc-progress-dots">
                    {fcCards.map((_, i) => (
                      <div
                        key={i}
                        className={`fc-dot ${i === fcIndex ? 'active' : ''}`}
                        onClick={() => { setFcIndex(i); setFcFlipped(false); }}
                        title={`Card ${i + 1}`}
                      />
                    ))}
                  </div>
                  <span className="fc-counter">{fcIndex + 1} / {fcCards.length}</span>
                </div>

                <button
                  className="fc-nav-btn"
                  disabled={fcIndex === fcCards.length - 1}
                  onClick={() => { setFcIndex(i => i + 1); setFcFlipped(false); }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
