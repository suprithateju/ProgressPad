import { run, query, initDB, get } from './database.js';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = [
  { id: uuidv4(), slug: 'engineering', label: 'Engineering Entrance', icon: 'ti-atom', color_ramp: 'blue', sort_order: 1 },
  { id: uuidv4(), slug: 'medical', label: 'Medical Entrance', icon: 'ti-stethoscope', color_ramp: 'teal', sort_order: 2 },
  { id: uuidv4(), slug: 'govt_ssc', label: 'Government Jobs — SSC', icon: 'ti-building-community', color_ramp: 'grey', sort_order: 3 },
  { id: uuidv4(), slug: 'railway', label: 'Railway', icon: 'ti-train', color_ramp: 'amber', sort_order: 4 },
  { id: uuidv4(), slug: 'banking', label: 'Banking & Finance', icon: 'ti-building-bank', color_ramp: 'purple', sort_order: 5 },
  { id: uuidv4(), slug: 'civil_services', label: 'Civil Services', icon: 'ti-school', color_ramp: 'peach', sort_order: 6 },
  { id: uuidv4(), slug: 'management_law', label: 'Management & Law', icon: 'ti-briefcase', color_ramp: 'pink', sort_order: 7 }
];

// Topic Pool Definitions (All 15-20 core topics for each shared vertical)
const physics_topics = [
  { section: 'Mechanics', topic: 'Kinematics', weightage: 4.2, difficulty: 'medium' },
  { section: 'Mechanics', topic: 'Laws of Motion & Friction', weightage: 3.8, difficulty: 'medium' },
  { section: 'Mechanics', topic: 'Work, Energy and Power', weightage: 4.5, difficulty: 'easy' },
  { section: 'Mechanics', topic: 'Rotational Motion & Inertia', weightage: 5.2, difficulty: 'hard' },
  { section: 'Mechanics', topic: 'Gravitation', weightage: 3.0, difficulty: 'easy' },
  { section: 'Properties of Matter', topic: 'Elasticity & Hydrodynamics', weightage: 2.8, difficulty: 'medium' },
  { section: 'Thermodynamics', topic: 'Thermal Properties & Heat Transfer', weightage: 3.2, difficulty: 'medium' },
  { section: 'Thermodynamics', topic: 'Thermodynamics & Heat Engines', weightage: 4.8, difficulty: 'hard' },
  { section: 'Waves & Oscillations', topic: 'Simple Harmonic Motion (SHM)', weightage: 3.5, difficulty: 'medium' },
  { section: 'Waves & Oscillations', topic: 'Wave Motion & Doppler Effect', weightage: 3.8, difficulty: 'hard' },
  { section: 'Electrodynamics', topic: 'Electrostatics & Gauss Law', weightage: 6.0, difficulty: 'hard' },
  { section: 'Electrodynamics', topic: 'Current Electricity & Circuit Networks', weightage: 5.5, difficulty: 'easy' },
  { section: 'Electrodynamics', topic: 'Magnetic Effects of Current & Magnetism', weightage: 5.8, difficulty: 'hard' },
  { section: 'Electrodynamics', topic: 'Electromagnetic Induction & AC', weightage: 5.0, difficulty: 'hard' },
  { section: 'Optics', topic: 'Ray Optics & Optical Instruments', weightage: 4.5, difficulty: 'hard' },
  { section: 'Optics', topic: 'Wave Optics & Interference', weightage: 3.2, difficulty: 'hard' },
  { section: 'Modern Physics', topic: 'Dual Nature of Matter & Radiation', weightage: 3.0, difficulty: 'easy' },
  { section: 'Modern Physics', topic: 'Atoms, Nuclei & Radioactivity', weightage: 4.0, difficulty: 'easy' },
  { section: 'Modern Physics', topic: 'Semiconductor Electronics & Gates', weightage: 3.5, difficulty: 'medium' }
];

const chemistry_topics = [
  { section: 'Physical Chemistry', topic: 'Mole Concept & Stoichiometry', weightage: 4.0, difficulty: 'easy' },
  { section: 'Physical Chemistry', topic: 'Atomic Structure & Quantum Numbers', weightage: 3.5, difficulty: 'medium' },
  { section: 'Physical Chemistry', topic: 'States of Matter (Gases & Liquids)', weightage: 2.8, difficulty: 'easy' },
  { section: 'Physical Chemistry', topic: 'Chemical & Ionic Equilibrium', weightage: 5.2, difficulty: 'hard' },
  { section: 'Physical Chemistry', topic: 'Chemical Thermodynamics', weightage: 5.0, difficulty: 'hard' },
  { section: 'Physical Chemistry', topic: 'Solutions & Colligative Properties', weightage: 3.8, difficulty: 'medium' },
  { section: 'Physical Chemistry', topic: 'Electrochemistry', weightage: 4.5, difficulty: 'hard' },
  { section: 'Physical Chemistry', topic: 'Chemical Kinetics', weightage: 4.2, difficulty: 'medium' },
  { section: 'Inorganic Chemistry', topic: 'Periodic Classification & Properties', weightage: 3.0, difficulty: 'easy' },
  { section: 'Inorganic Chemistry', topic: 'Chemical Bonding & Molecular Structure', weightage: 6.5, difficulty: 'medium' },
  { section: 'Inorganic Chemistry', topic: 'p-Block Elements', weightage: 5.5, difficulty: 'hard' },
  { section: 'Inorganic Chemistry', topic: 'd & f Block Elements & Coordination Compounds', weightage: 6.0, difficulty: 'hard' },
  { section: 'Organic Chemistry', topic: 'General Organic Chemistry (GOC)', weightage: 7.0, difficulty: 'hard' },
  { section: 'Organic Chemistry', topic: 'Hydrocarbons (Alkanes, Alkenes, Alkynes)', weightage: 4.8, difficulty: 'medium' },
  { section: 'Organic Chemistry', topic: 'Haloalkanes & Haloarenes', weightage: 3.5, difficulty: 'medium' },
  { section: 'Organic Chemistry', topic: 'Alcohols, Phenols & Ethers', weightage: 4.2, difficulty: 'medium' },
  { section: 'Organic Chemistry', topic: 'Aldehydes, Ketones & Carboxylic Acids', weightage: 5.5, difficulty: 'hard' },
  { section: 'Organic Chemistry', topic: 'Organic Compounds containing Nitrogen', weightage: 3.8, difficulty: 'medium' },
  { section: 'Organic Chemistry', topic: 'Biomolecules & Polymers', weightage: 3.0, difficulty: 'easy' }
];

const maths_jee_topics = [
  { section: 'Algebra', topic: 'Quadratic Equations', weightage: 4.0, difficulty: 'easy' },
  { section: 'Algebra', topic: 'Complex Numbers', weightage: 4.5, difficulty: 'hard' },
  { section: 'Algebra', topic: 'Sequences & Series (AP, GP, HP)', weightage: 3.8, difficulty: 'easy' },
  { section: 'Algebra', topic: 'Matrices & Determinants', weightage: 5.5, difficulty: 'easy' },
  { section: 'Algebra', topic: 'Permutations & Combinations', weightage: 4.2, difficulty: 'hard' },
  { section: 'Algebra', topic: 'Binomial Theorem', weightage: 3.0, difficulty: 'medium' },
  { section: 'Algebra', topic: 'Probability', weightage: 6.0, difficulty: 'hard' },
  { section: 'Calculus', topic: 'Functions, Limits & Continuity', weightage: 5.0, difficulty: 'medium' },
  { section: 'Calculus', topic: 'Differentiation & Applications of Derivatives (AOD)', weightage: 6.5, difficulty: 'hard' },
  { section: 'Calculus', topic: 'Indefinite & Definite Integration', weightage: 6.8, difficulty: 'hard' },
  { section: 'Calculus', topic: 'Differential Equations', weightage: 4.5, difficulty: 'medium' },
  { section: 'Coordinate Geometry', topic: 'Straight Lines & Pairs of Lines', weightage: 4.0, difficulty: 'easy' },
  { section: 'Coordinate Geometry', topic: 'Circles', weightage: 4.5, difficulty: 'medium' },
  { section: 'Coordinate Geometry', topic: 'Conic Sections (Parabola, Ellipse, Hyperbola)', weightage: 6.0, difficulty: 'hard' },
  { section: 'Vectors & 3D', topic: 'Vector Algebra', weightage: 5.0, difficulty: 'easy' },
  { section: 'Vectors & 3D', topic: 'Three Dimensional Geometry', weightage: 6.5, difficulty: 'hard' },
  { section: 'Trigonometry', topic: 'Trigonometric Ratios, Identities & Equations', weightage: 3.5, difficulty: 'medium' }
];

const biology_neet_topics = [
  { section: 'Botany', topic: 'Diversity in Living World & Plant Kingdom', weightage: 6.0, difficulty: 'easy' },
  { section: 'Botany', topic: 'Plant Anatomy & Morphology', weightage: 7.5, difficulty: 'medium' },
  { section: 'Botany', topic: 'Cell Structure & Division', weightage: 9.0, difficulty: 'easy' },
  { section: 'Botany', topic: 'Plant Physiology & Photosynthesis', weightage: 12.0, difficulty: 'medium' },
  { section: 'Botany', topic: 'Genetics & Molecular Basis of Inheritance', weightage: 14.0, difficulty: 'hard' },
  { section: 'Botany', topic: 'Ecology & Biodiversity', weightage: 10.0, difficulty: 'easy' },
  { section: 'Zoology', topic: 'Animal Kingdom', weightage: 6.5, difficulty: 'medium' },
  { section: 'Zoology', topic: 'Structural Organisation in Animals & Biomolecules', weightage: 8.0, difficulty: 'medium' },
  { section: 'Zoology', topic: 'Human Digestion & Respiration', weightage: 6.0, difficulty: 'easy' },
  { section: 'Zoology', topic: 'Circulation, Excretion & Locomotion', weightage: 8.0, difficulty: 'medium' },
  { section: 'Zoology', topic: 'Neural Coordination & Chemical Integration', weightage: 9.0, difficulty: 'hard' },
  { section: 'Zoology', topic: 'Human Reproduction & Reproductive Health', weightage: 9.5, difficulty: 'medium' },
  { section: 'Zoology', topic: 'Evolution & Origin of Life', weightage: 7.0, difficulty: 'easy' },
  { section: 'Zoology', topic: 'Biotechnology & Applications', weightage: 11.5, difficulty: 'hard' },
  { section: 'Zoology', topic: 'Human Health & Diseases', weightage: 8.0, difficulty: 'easy' }
];

const qa_topics = [
  { section: 'Arithmetic', topic: 'Percentage', weightage: 4.5, difficulty: 'easy' },
  { section: 'Arithmetic', topic: 'Ratio and Proportion', weightage: 4.0, difficulty: 'easy' },
  { section: 'Arithmetic', topic: 'Profit, Loss and Discount', weightage: 5.0, difficulty: 'medium' },
  { section: 'Arithmetic', topic: 'Simple & Compound Interest', weightage: 4.2, difficulty: 'medium' },
  { section: 'Arithmetic', topic: 'Time and Work & Pipes and Cisterns', weightage: 4.8, difficulty: 'easy' },
  { section: 'Arithmetic', topic: 'Speed, Time and Distance & Boats', weightage: 5.0, difficulty: 'medium' },
  { section: 'Arithmetic', topic: 'Averages, Mixtures & Alligations', weightage: 3.5, difficulty: 'easy' },
  { section: 'Number Systems', topic: 'Number System, HCF & LCM', weightage: 4.0, difficulty: 'easy' },
  { section: 'Algebra', topic: 'Basic Algebra & Equations', weightage: 5.5, difficulty: 'medium' },
  { section: 'Geometry', topic: 'Lines, Angles, Triangles & Circles', weightage: 6.5, difficulty: 'hard' },
  { section: 'Mensuration', topic: 'Area & Perimeter (2D) & Volume (3D)', weightage: 5.8, difficulty: 'medium' },
  { section: 'Trigonometry', topic: 'Trigonometric Heights & Distances', weightage: 3.8, difficulty: 'medium' },
  { section: 'Data Interpretation', topic: 'DI (Tabular, Bar, Line & Pie Charts)', weightage: 10.0, difficulty: 'medium' }
];

const reasoning_topics = [
  { section: 'Verbal Reasoning', topic: 'Number & Alphabet Series', weightage: 6.0, difficulty: 'easy' },
  { section: 'Verbal Reasoning', topic: 'Coding-Decoding', weightage: 5.5, difficulty: 'easy' },
  { section: 'Verbal Reasoning', topic: 'Blood Relations', weightage: 4.0, difficulty: 'easy' },
  { section: 'Verbal Reasoning', topic: 'Syllogism', weightage: 4.5, difficulty: 'medium' },
  { section: 'Analytical', topic: 'Puzzles & Seating Arrangement', weightage: 15.0, difficulty: 'hard' },
  { section: 'Verbal Reasoning', topic: 'Direction Sense Test', weightage: 3.5, difficulty: 'easy' },
  { section: 'Verbal Reasoning', topic: 'Analogy & Classification', weightage: 5.0, difficulty: 'easy' },
  { section: 'Logical', topic: 'Venn Diagrams', weightage: 3.0, difficulty: 'easy' },
  { section: 'Non-Verbal', topic: 'Mirror Images & Paper Folding', weightage: 4.0, difficulty: 'easy' },
  { section: 'Analytical', topic: 'Data Sufficiency', weightage: 6.0, difficulty: 'medium' }
];

const english_topics = [
  { section: 'Grammar', topic: 'Spotting the Errors', weightage: 15.0, difficulty: 'medium' },
  { section: 'Grammar', topic: 'Sentence Improvement & Fillers', weightage: 12.0, difficulty: 'easy' },
  { section: 'Vocabulary', topic: 'Cloze Test', weightage: 14.0, difficulty: 'medium' },
  { section: 'Comprehension', topic: 'Reading Comprehension', weightage: 20.0, difficulty: 'hard' },
  { section: 'Vocabulary', topic: 'Synonyms & Antonyms', weightage: 15.0, difficulty: 'medium' },
  { section: 'Vocabulary', topic: 'Idioms & Phrases', weightage: 8.0, difficulty: 'easy' },
  { section: 'Vocabulary', topic: 'One Word Substitution', weightage: 8.0, difficulty: 'easy' },
  { section: 'Grammar', topic: 'Parajumbles & Reordering', weightage: 8.0, difficulty: 'medium' }
];

const gk_topics = [
  { section: 'History', topic: 'Ancient & Medieval Indian History', weightage: 6.0, difficulty: 'medium' },
  { section: 'History', topic: 'Modern Indian History & Freedom Struggle', weightage: 10.0, difficulty: 'medium' },
  { section: 'Polity', topic: 'Indian Constitution, Judiciary & Parliament', weightage: 12.0, difficulty: 'medium' },
  { section: 'Geography', topic: 'Physical Geography & World Geography', weightage: 8.0, difficulty: 'hard' },
  { section: 'Geography', topic: 'Indian Geography, Climate & Rivers', weightage: 10.0, difficulty: 'easy' },
  { section: 'Economy', topic: 'Indian Economy, Budget & Planning', weightage: 9.0, difficulty: 'hard' },
  { section: 'General Science', topic: 'Physics & Chemistry Basics', weightage: 8.0, difficulty: 'easy' },
  { section: 'General Science', topic: 'Biology, Ecology & Environment', weightage: 10.0, difficulty: 'easy' },
  { section: 'Current Affairs', topic: 'National, International Affairs & Awards', weightage: 15.0, difficulty: 'medium' },
  { section: 'General Knowledge', topic: 'Static GK & Miscellaneous facts', weightage: 12.0, difficulty: 'easy' }
];

const computer_topics = [
  { section: 'Hardware & OS', topic: 'Computer Hardware Components & OS', weightage: 25.0, difficulty: 'easy' },
  { section: 'Software', topic: 'MS Office & Application Software', weightage: 20.0, difficulty: 'easy' },
  { section: 'Networking', topic: 'Internet, Protocols & Computer Networks', weightage: 30.0, difficulty: 'medium' },
  { section: 'Security', topic: 'Cyber Security, Malware & Database Basics', weightage: 25.0, difficulty: 'medium' }
];

const law_legal_topics = [
  { section: 'Constitution', topic: 'Constitutional Law, Rights & Assembly', weightage: 25.0, difficulty: 'medium' },
  { section: 'Civil Law', topic: 'Law of Torts & Liability', weightage: 20.0, difficulty: 'medium' },
  { section: 'Civil Law', topic: 'Law of Contracts & Obligations', weightage: 20.0, difficulty: 'hard' },
  { section: 'Criminal Law', topic: 'Criminal Law & IPC basics', weightage: 15.0, difficulty: 'hard' },
  { section: 'Legal Aptitude', topic: 'Legal Maxims & Logical Reasoning', weightage: 20.0, difficulty: 'easy' }
];

const management_dm_topics = [
  { section: 'Ethical Scenarios', topic: 'Business Case Decision Analysis', weightage: 40.0, difficulty: 'hard' },
  { section: 'HR Scenarios', topic: 'Ethics and HR Conflict Resolution', weightage: 35.0, difficulty: 'medium' },
  { section: 'Analytical Decisions', topic: 'Logical & Numerical Data Decisions', weightage: 25.0, difficulty: 'hard' }
];

const upsc_gs_topics = [
  { section: 'GS Part I', topic: 'Indian Culture, Heritage & Art Forms', weightage: 10.0, difficulty: 'hard' },
  { section: 'GS Part I', topic: 'Modern Indian History & Post-Independence', weightage: 12.0, difficulty: 'medium' },
  { section: 'GS Part I', topic: 'Physical & Indian Geography (UPSC Core)', weightage: 15.0, difficulty: 'hard' },
  { section: 'GS Part II', topic: 'Indian Constitution, Governance & Social Justice', weightage: 18.0, difficulty: 'medium' },
  { section: 'GS Part II', topic: 'International Relations & Global Groupings', weightage: 10.0, difficulty: 'medium' },
  { section: 'GS Part III', topic: 'Indian Economy, Agriculture & Infrastructure', weightage: 15.0, difficulty: 'hard' },
  { section: 'GS Part III', topic: 'Science & Technology Developments', weightage: 8.0, difficulty: 'medium' },
  { section: 'GS Part III', topic: 'Environment, Biodiversity & Climate Change', weightage: 10.0, difficulty: 'medium' },
  { section: 'GS Part III', topic: 'Internal Security & Disaster Management', weightage: 8.0, difficulty: 'medium' },
  { section: 'GS Part IV', topic: 'Ethics, Integrity & Case Studies', weightage: 14.0, difficulty: 'hard' }
];

const medical_pg_topics = [
  { section: 'Pre-Clinical', topic: 'Human Anatomy & Embryology', weightage: 12.0, difficulty: 'hard' },
  { section: 'Pre-Clinical', topic: 'Physiology & Biophysics', weightage: 10.0, difficulty: 'medium' },
  { section: 'Pre-Clinical', topic: 'Biochemistry & Molecular Medicine', weightage: 8.0, difficulty: 'medium' },
  { section: 'Para-Clinical', topic: 'Pathology & Diagnostic Slides', weightage: 15.0, difficulty: 'hard' },
  { section: 'Para-Clinical', topic: 'Microbiology & Infectious Diseases', weightage: 10.0, difficulty: 'medium' },
  { section: 'Para-Clinical', topic: 'Pharmacology & Drug Therapeutics', weightage: 12.0, difficulty: 'hard' },
  { section: 'Clinical', topic: 'Social & Preventive Medicine (SPM)', weightage: 15.0, difficulty: 'medium' },
  { section: 'Clinical', topic: 'General Medicine & Paediatrics', weightage: 20.0, difficulty: 'hard' },
  { section: 'Clinical', topic: 'General Surgery & Orthopaedics', weightage: 18.0, difficulty: 'hard' }
];

const gate_cs_topics = [
  { section: 'Math & Logic', topic: 'Discrete Mathematics & Graph Theory', weightage: 15.0, difficulty: 'hard' },
  { section: 'Math & Logic', topic: 'Digital Logic & Boolean Algebra', weightage: 8.0, difficulty: 'easy' },
  { section: 'Systems', topic: 'Computer Organization & Architecture', weightage: 12.0, difficulty: 'hard' },
  { section: 'Theory', topic: 'Programming & Data Structures', weightage: 14.0, difficulty: 'medium' },
  { section: 'Theory', topic: 'Design & Analysis of Algorithms', weightage: 15.0, difficulty: 'hard' },
  { section: 'Theory', topic: 'Theory of Computation (TOC)', weightage: 10.0, difficulty: 'hard' },
  { section: 'Theory', topic: 'Compiler Design', weightage: 6.0, difficulty: 'medium' },
  { section: 'Systems', topic: 'Operating Systems & Process Concurrency', weightage: 12.0, difficulty: 'medium' },
  { section: 'Systems', topic: 'Database Systems & SQL', weightage: 8.0, difficulty: 'medium' },
  { section: 'Systems', topic: 'Computer Networks', weightage: 10.0, difficulty: 'hard' }
];

const gate_ece_topics = [
  { section: 'ECE Core', topic: 'Network Theory & Graphs', weightage: 12.0, difficulty: 'medium' },
  { section: 'ECE Core', topic: 'Signals and Systems', weightage: 14.0, difficulty: 'medium' },
  { section: 'ECE Core', topic: 'Electronic Devices & Semiconductor Physics', weightage: 15.0, difficulty: 'hard' },
  { section: 'ECE Core', topic: 'Analog Circuits & Op-Amps', weightage: 15.0, difficulty: 'hard' },
  { section: 'ECE Core', topic: 'Digital Circuits & Microprocessors', weightage: 12.0, difficulty: 'easy' },
  { section: 'ECE Core', topic: 'Control Systems', weightage: 12.0, difficulty: 'medium' },
  { section: 'ECE Core', topic: 'Communications & Probability', weightage: 14.0, difficulty: 'hard' },
  { section: 'ECE Core', topic: 'Electromagnetics & Transmission Lines', weightage: 12.0, difficulty: 'hard' }
];

const gate_me_topics = [
  { section: 'ME Core', topic: 'Engineering Mechanics & Strength of Materials', weightage: 18.0, difficulty: 'hard' },
  { section: 'ME Core', topic: 'Theory of Machines & Vibrations', weightage: 15.0, difficulty: 'hard' },
  { section: 'ME Core', topic: 'Machine Design', weightage: 12.0, difficulty: 'medium' },
  { section: 'Thermal', topic: 'Fluid Mechanics & Turbo Machinery', weightage: 15.0, difficulty: 'medium' },
  { section: 'Thermal', topic: 'Heat Transfer', weightage: 10.0, difficulty: 'medium' },
  { section: 'Thermal', topic: 'Thermodynamics & Applications', weightage: 15.0, difficulty: 'medium' },
  { section: 'Manufacturing', topic: 'Manufacturing Technology & Materials', weightage: 20.0, difficulty: 'hard' },
  { section: 'Manufacturing', topic: 'Industrial Engineering & Operations Research', weightage: 10.0, difficulty: 'medium' }
];

// Helper to determine priority
function getPriorityVal(idx) {
  if (idx % 3 === 0) return 'High';
  if (idx % 3 === 1) return 'Medium';
  return 'Low';
}

// Helper to determine book/resource
function getResourceBook(examSlug, subjSlug, topicName) {
  if (examSlug.startsWith('jee')) {
    if (subjSlug === 'physics') return 'HC Verma Vol 1/2';
    if (subjSlug === 'chemistry') return 'O.P. Tandon / J.D. Lee';
    return 'Cengage Mathematics';
  }
  if (examSlug === 'neet_ug' || examSlug === 'aiims_jipmer') {
    return 'NCERT Biology / Physics / Chem';
  }
  if (examSlug.startsWith('ssc') || examSlug.startsWith('rrb')) {
    if (subjSlug === 'english') return 'Plinth to Paramount';
    if (subjSlug === 'gk' || subjSlug.includes('science')) return 'Lucent\'s General Knowledge';
    return 'Kiran Publication Practice Book';
  }
  if (examSlug.includes('bank') || examSlug.startsWith('ibps') || examSlug.startsWith('sbi') || examSlug.startsWith('rbi')) {
    if (subjSlug === 'english') return 'SP Bakshi English';
    if (subjSlug === 'qa' || subjSlug === 'mathematics') return 'R.S. Aggarwal Quant';
    if (subjSlug === 'reasoning') return 'BSC Analytical Reasoning';
    if (subjSlug === 'computer') return 'Arihant Computer Awareness';
    return 'Pratiyogita Darpan (Economy)';
  }
  if (examSlug === 'upsc_cse' || examSlug.startsWith('state_psc')) {
    if (topicName.includes('Polity') || topicName.includes('Constitution')) return 'M. Laxmikanth Polity';
    if (topicName.includes('History')) return 'Spectrum Modern India / Bipin Chandra';
    if (topicName.includes('Geography')) return 'GC Leong / NCERT Geography';
    if (topicName.includes('Economy')) return 'Ramesh Singh Indian Economy';
    return 'Standard UPSC Core Reference';
  }
  if (examSlug === 'cat' || examSlug === 'xat') {
    if (subjSlug === 'qa' || subjSlug === 'mathematics') return 'Arun Sharma Quant';
    if (subjSlug === 'varc' || subjSlug === 'english') return 'Word Power Made Easy / Aeon';
    return 'Arun Sharma LRDI';
  }
  if (examSlug === 'clat') {
    if (subjSlug === 'legal') return 'Universal Legal Reasoning';
    return 'Pearson Legal GK';
  }
  if (examSlug.startsWith('gate')) {
    return 'Standard University Textbooks / GATE Core Wiley';
  }
  return 'Standard Reference Guide';
}

// 29 Exams definitions to populate the DB
const EXAMS = [
  // 1. Engineering Entrance
  {
    slug: 'jee_main',
    name: 'JEE Main',
    full_name: 'Joint Entrance Examination — Mains',
    conducting_body: 'NTA',
    frequency: '2x / year',
    safe_cutoff: 92.5,
    category_slug: 'engineering',
    tiers: [{ name: 'Mains', max: 300 }],
    marking_scheme: { correct: 4, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Physics', slug: 'physics', color: '#3B82F6', max_marks: 100, question_count: 30, shared_pool_key: 'physics', topics: physics_topics },
      { name: 'Chemistry', slug: 'chemistry', color: '#10B981', max_marks: 100, question_count: 30, shared_pool_key: 'chemistry', topics: chemistry_topics },
      { name: 'Mathematics', slug: 'mathematics', color: '#EC4899', max_marks: 100, question_count: 30, shared_pool_key: 'maths_jee', topics: maths_jee_topics }
    ]
  },
  {
    slug: 'jee_advanced',
    name: 'JEE Advanced',
    full_name: 'Joint Entrance Examination — Advanced',
    conducting_body: 'IITs',
    frequency: '1x / year',
    safe_cutoff: 115.0,
    category_slug: 'engineering',
    tiers: [{ name: 'Paper 1', max: 180 }, { name: 'Paper 2', max: 180 }],
    marking_scheme: { correct: 3, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Physics', slug: 'physics', color: '#3B82F6', max_marks: 120, question_count: 36, shared_pool_key: 'physics', topics: physics_topics },
      { name: 'Chemistry', slug: 'chemistry', color: '#10B981', max_marks: 120, question_count: 36, shared_pool_key: 'chemistry', topics: chemistry_topics },
      { name: 'Mathematics', slug: 'mathematics', color: '#EC4899', max_marks: 120, question_count: 36, shared_pool_key: 'maths_jee', topics: maths_jee_topics }
    ]
  },
  {
    slug: 'gate_cs',
    name: 'GATE CS',
    full_name: 'Graduate Aptitude Test in Engineering — Computer Science',
    conducting_body: 'IISc & IITs',
    frequency: '1x / year',
    safe_cutoff: 28.5,
    category_slug: 'engineering',
    tiers: [{ name: 'CBT Exam', max: 100 }],
    marking_scheme: { correct: 2, wrong: -0.66, unattempted: 0 },
    subjects: [
      { name: 'Computer Science Core', slug: 'cs_core', color: '#6366F1', max_marks: 85, question_count: 55, shared_pool_key: 'gate_cs', topics: gate_cs_topics },
      { name: 'Engineering Math & Aptitude', slug: 'math_aptitude', color: '#3B82F6', max_marks: 15, question_count: 10, shared_pool_key: 'qa', topics: qa_topics.slice(0, 8) }
    ]
  },
  {
    slug: 'gate_ece',
    name: 'GATE ECE',
    full_name: 'Graduate Aptitude Test in Engineering — Electronics & Comm.',
    conducting_body: 'IISc & IITs',
    frequency: '1x / year',
    safe_cutoff: 25.0,
    category_slug: 'engineering',
    tiers: [{ name: 'CBT Exam', max: 100 }],
    marking_scheme: { correct: 2, wrong: -0.66, unattempted: 0 },
    subjects: [
      { name: 'Electronics Core', slug: 'ece_core', color: '#EC4899', max_marks: 85, question_count: 55, shared_pool_key: 'gate_ece', topics: gate_ece_topics },
      { name: 'Engineering Math & Aptitude', slug: 'math_aptitude', color: '#3B82F6', max_marks: 15, question_count: 10, shared_pool_key: 'qa', topics: qa_topics.slice(0, 8) }
    ]
  },
  {
    slug: 'gate_me',
    name: 'GATE ME',
    full_name: 'Graduate Aptitude Test in Engineering — Mechanical',
    conducting_body: 'IISc & IITs',
    frequency: '1x / year',
    safe_cutoff: 33.0,
    category_slug: 'engineering',
    tiers: [{ name: 'CBT Exam', max: 100 }],
    marking_scheme: { correct: 2, wrong: -0.66, unattempted: 0 },
    subjects: [
      { name: 'Mechanical Core', slug: 'me_core', color: '#F59E0B', max_marks: 85, question_count: 55, shared_pool_key: 'gate_me', topics: gate_me_topics },
      { name: 'Engineering Math & Aptitude', slug: 'math_aptitude', color: '#3B82F6', max_marks: 15, question_count: 10, shared_pool_key: 'qa', topics: qa_topics.slice(0, 8) }
    ]
  },
  {
    slug: 'state_cet',
    name: 'State CET',
    full_name: 'MHT-CET / KCET / WBJEE / VITEEE Entrance',
    conducting_body: 'State Boards',
    frequency: '1x / year',
    safe_cutoff: 120.0,
    category_slug: 'engineering',
    tiers: [{ name: 'Entrance Exam', max: 200 }],
    marking_scheme: { correct: 1, wrong: 0, unattempted: 0 },
    subjects: [
      { name: 'Physics', slug: 'physics', color: '#3B82F6', max_marks: 50, question_count: 50, shared_pool_key: 'physics', topics: physics_topics },
      { name: 'Chemistry', slug: 'chemistry', color: '#10B981', max_marks: 50, question_count: 50, shared_pool_key: 'chemistry', topics: chemistry_topics },
      { name: 'Mathematics', slug: 'mathematics', color: '#EC4899', max_marks: 100, question_count: 50, shared_pool_key: 'maths_jee', topics: maths_jee_topics }
    ]
  },

  // 2. Medical Entrance
  {
    slug: 'neet_ug',
    name: 'NEET UG',
    full_name: 'National Eligibility cum Entrance Test — Undergraduate',
    conducting_body: 'NTA',
    frequency: '1x / year',
    safe_cutoff: 615.0,
    category_slug: 'medical',
    tiers: [{ name: 'NEET Exam', max: 720 }],
    marking_scheme: { correct: 4, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Physics', slug: 'physics', color: '#3B82F6', max_marks: 180, question_count: 45, shared_pool_key: 'physics', topics: physics_topics },
      { name: 'Chemistry', slug: 'chemistry', color: '#10B981', max_marks: 180, question_count: 45, shared_pool_key: 'chemistry', topics: chemistry_topics },
      { name: 'Biology', slug: 'biology', color: '#F59E0B', max_marks: 360, question_count: 90, shared_pool_key: 'biology_neet', topics: biology_neet_topics }
    ]
  },
  {
    slug: 'neet_pg',
    name: 'NEET PG',
    full_name: 'Postgraduate Medical Entrance Exam',
    conducting_body: 'NBE',
    frequency: '1x / year',
    safe_cutoff: 510.0,
    category_slug: 'medical',
    tiers: [{ name: 'CBT Exam', max: 800 }],
    marking_scheme: { correct: 4, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Pre & Para-Clinical Subjects', slug: 'pre_clinical', color: '#8B5CF6', max_marks: 300, question_count: 75, shared_pool_key: 'medical_pg', topics: medical_pg_topics.slice(0, 6) },
      { name: 'Clinical Specialities', slug: 'clinical_spec', color: '#EC4899', max_marks: 500, question_count: 125, shared_pool_key: 'medical_pg', topics: medical_pg_topics.slice(5) }
    ]
  },
  {
    slug: 'aiims_jipmer',
    name: 'AIIMS / JIPMER',
    full_name: 'Top Medical Institute Entrances (Historical pattern)',
    conducting_body: 'AIIMS Delhi',
    frequency: '1x / year',
    safe_cutoff: 135.0,
    category_slug: 'medical',
    tiers: [{ name: 'Aptitude Test', max: 200 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Physics', slug: 'physics', color: '#3B82F6', max_marks: 60, question_count: 60, shared_pool_key: 'physics', topics: physics_topics },
      { name: 'Chemistry', slug: 'chemistry', color: '#10B981', max_marks: 60, question_count: 60, shared_pool_key: 'chemistry', topics: chemistry_topics },
      { name: 'Biology', slug: 'biology', color: '#F59E0B', max_marks: 60, question_count: 60, shared_pool_key: 'biology_neet', topics: biology_neet_topics },
      { name: 'General Knowledge & Logic', slug: 'gk', color: '#8B5CF6', max_marks: 20, question_count: 20, shared_pool_key: 'gk', topics: gk_topics.slice(0, 5) }
    ]
  },

  // 3. Government Jobs - SSC
  {
    slug: 'ssc_cgl',
    name: 'SSC CGL',
    full_name: 'Combined Graduate Level Examination',
    conducting_body: 'SSC',
    frequency: 'Annual',
    safe_cutoff: 142.0,
    category_slug: 'govt_ssc',
    tiers: [{ name: 'Tier 1', max: 200 }, { name: 'Tier 2', max: 390 }],
    marking_scheme: { correct: 2, wrong: -0.5, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 50, question_count: 25, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning & Intelligence', slug: 'reasoning', color: '#10B981', max_marks: 50, question_count: 25, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 50, question_count: 25, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 50, question_count: 25, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'ssc_chsl',
    name: 'SSC CHSL',
    full_name: 'Combined Higher Secondary Level (10+2) Exam',
    conducting_body: 'SSC',
    frequency: 'Annual',
    safe_cutoff: 151.0,
    category_slug: 'govt_ssc',
    tiers: [{ name: 'Tier 1', max: 200 }, { name: 'Tier 2', max: 360 }],
    marking_scheme: { correct: 2, wrong: -0.5, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 50, question_count: 25, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning', slug: 'reasoning', color: '#10B981', max_marks: 50, question_count: 25, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 50, question_count: 25, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 50, question_count: 25, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'ssc_mts',
    name: 'SSC MTS',
    full_name: 'Multi Tasking (Non-Technical) Staff Exam',
    conducting_body: 'SSC',
    frequency: 'Annual',
    safe_cutoff: 125.0,
    category_slug: 'govt_ssc',
    tiers: [{ name: 'Session 1 (Math/Reason)', max: 120 }, { name: 'Session 2 (Eng/GK)', max: 150 }],
    marking_scheme: { correct: 3, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Numerical Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 60, question_count: 20, shared_pool_key: 'qa', topics: qa_topics.slice(0, 10) },
      { name: 'Reasoning Ability', slug: 'reasoning', color: '#10B981', max_marks: 60, question_count: 20, shared_pool_key: 'reasoning', topics: reasoning_topics.slice(0, 7) },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 75, question_count: 25, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 75, question_count: 25, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'ssc_cpo_gd',
    name: 'SSC CPO / GD',
    full_name: 'Sub-Inspector in Delhi Police & CAPF / GD Constable',
    conducting_body: 'SSC',
    frequency: 'Annual',
    safe_cutoff: 115.0,
    category_slug: 'govt_ssc',
    tiers: [{ name: 'Paper 1', max: 200 }, { name: 'Paper 2 (English)', max: 200 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 50, question_count: 50, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'General Intelligence', slug: 'reasoning', color: '#10B981', max_marks: 50, question_count: 50, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Comprehension', slug: 'english', color: '#8B5CF6', max_marks: 50, question_count: 50, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 50, question_count: 50, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },

  // 4. Railway
  {
    slug: 'rrb_ntpc',
    name: 'RRB NTPC',
    full_name: 'Railway NTPC Recruitment CBT',
    conducting_body: 'RRB',
    frequency: 'Periodic',
    safe_cutoff: 76.5,
    category_slug: 'railway',
    tiers: [{ name: 'CBT 1', max: 100 }, { name: 'CBT 2', max: 120 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#3B82F6', max_marks: 30, question_count: 30, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'General Intelligence', slug: 'reasoning', color: '#10B981', max_marks: 30, question_count: 30, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 40, question_count: 40, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'rrb_group_d',
    name: 'RRB Group D',
    full_name: 'Level 1 Railway Recruitment CBT',
    conducting_body: 'RRB',
    frequency: 'Periodic',
    safe_cutoff: 71.0,
    category_slug: 'railway',
    tiers: [{ name: 'CBT Test', max: 100 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#3B82F6', max_marks: 25, question_count: 25, shared_pool_key: 'qa', topics: qa_topics.slice(0, 10) },
      { name: 'General Intelligence', slug: 'reasoning', color: '#10B981', max_marks: 30, question_count: 30, shared_pool_key: 'reasoning', topics: reasoning_topics.slice(0, 8) },
      { name: 'General Science', slug: 'science', color: '#EC4899', max_marks: 25, question_count: 25, shared_pool_key: 'physics', topics: physics_topics.slice(0, 8) },
      { name: 'General Awareness & CA', slug: 'gk', color: '#EAB308', max_marks: 20, question_count: 20, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'rrb_je',
    name: 'RRB JE',
    full_name: 'Junior Engineer Recruitment Exam',
    conducting_body: 'RRB',
    frequency: 'Periodic',
    safe_cutoff: 79.5,
    category_slug: 'railway',
    tiers: [{ name: 'CBT 1', max: 100 }, { name: 'CBT 2', max: 150 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#3B82F6', max_marks: 30, question_count: 30, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'General Intelligence', slug: 'reasoning', color: '#10B981', max_marks: 25, question_count: 25, shared_pool_key: 'reasoning', topics: reasoning_topics.slice(0, 8) },
      { name: 'General Science', slug: 'science', color: '#EC4899', max_marks: 30, question_count: 30, shared_pool_key: 'physics', topics: physics_topics.slice(0, 10) },
      { name: 'General Awareness', slug: 'gk', color: '#EAB308', max_marks: 15, question_count: 15, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'rrb_alp',
    name: 'RRB ALP',
    full_name: 'Assistant Loco Pilot CBT',
    conducting_body: 'RRB',
    frequency: 'Periodic',
    safe_cutoff: 68.0,
    category_slug: 'railway',
    tiers: [{ name: 'First Stage CBT', max: 75 }, { name: 'Second Stage Part A', max: 100 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#3B82F6', max_marks: 20, question_count: 20, shared_pool_key: 'qa', topics: qa_topics.slice(0, 12) },
      { name: 'Mental Ability', slug: 'reasoning', color: '#10B981', max_marks: 25, question_count: 25, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'Basic Science & Eng', slug: 'science', color: '#8B5CF6', max_marks: 40, question_count: 40, shared_pool_key: 'physics', topics: physics_topics.slice(0, 12) }
    ]
  },

  // 5. Banking
  {
    slug: 'ibps_po',
    name: 'IBPS PO',
    full_name: 'IBPS Probationary Officer Entrance',
    conducting_body: 'IBPS',
    frequency: 'Annual',
    safe_cutoff: 56.5,
    category_slug: 'banking',
    tiers: [{ name: 'Prelims', max: 100 }, { name: 'Mains', max: 225 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 35, question_count: 35, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning Ability', slug: 'reasoning', color: '#10B981', max_marks: 35, question_count: 35, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 30, question_count: 30, shared_pool_key: 'english', topics: english_topics },
      { name: 'Computer Awareness', slug: 'computer', color: '#EC4899', max_marks: 20, question_count: 20, shared_pool_key: 'computer_bank', topics: computer_topics }
    ]
  },
  {
    slug: 'ibps_clerk',
    name: 'IBPS Clerk',
    full_name: 'IBPS Clerical Cadre Exam',
    conducting_body: 'IBPS',
    frequency: 'Annual',
    safe_cutoff: 76.0,
    category_slug: 'banking',
    tiers: [{ name: 'Prelims', max: 100 }, { name: 'Mains', max: 200 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Numerical Ability', slug: 'qa', color: '#3B82F6', max_marks: 35, question_count: 35, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning Ability', slug: 'reasoning', color: '#10B981', max_marks: 35, question_count: 35, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 30, question_count: 30, shared_pool_key: 'english', topics: english_topics }
    ]
  },
  {
    slug: 'sbi_po_clerk',
    name: 'SBI PO / Clerk',
    full_name: 'State Bank of India Recruitment Board',
    conducting_body: 'SBI',
    frequency: 'Annual',
    safe_cutoff: 59.0,
    category_slug: 'banking',
    tiers: [{ name: 'Prelims', max: 100 }, { name: 'Mains', max: 250 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 35, question_count: 35, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning Ability', slug: 'reasoning', color: '#10B981', max_marks: 35, question_count: 35, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 30, question_count: 30, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Financial Awareness', slug: 'gk', color: '#EAB308', max_marks: 40, question_count: 40, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'rbi_grade_b',
    name: 'RBI Grade B',
    full_name: 'Reserve Bank of India Officers Grade B Exam',
    conducting_body: 'RBI',
    frequency: 'Annual',
    safe_cutoff: 67.0,
    category_slug: 'banking',
    tiers: [{ name: 'Phase 1 Exam', max: 200 }, { name: 'Phase 2 (Finance/ES)', max: 300 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 30, question_count: 30, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Reasoning', slug: 'reasoning', color: '#10B981', max_marks: 60, question_count: 60, shared_pool_key: 'reasoning', topics: reasoning_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 30, question_count: 30, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Awareness & Finance', slug: 'gk', color: '#EAB308', max_marks: 80, question_count: 80, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },
  {
    slug: 'sebi_nabard',
    name: 'SEBI / NABARD',
    full_name: 'SEBI Grade A Officer / NABARD Grade A Officer',
    conducting_body: 'SEBI & NABARD',
    frequency: 'Annual',
    safe_cutoff: 82.0,
    category_slug: 'banking',
    tiers: [{ name: 'Phase 1 Paper 1', max: 100 }, { name: 'Phase 1 Paper 2', max: 100 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Aptitude', slug: 'qa', color: '#3B82F6', max_marks: 20, question_count: 20, shared_pool_key: 'qa', topics: qa_topics.slice(0, 10) },
      { name: 'English Language & GK', slug: 'english', color: '#8B5CF6', max_marks: 40, question_count: 40, shared_pool_key: 'english', topics: english_topics },
      { name: 'Reasoning', slug: 'reasoning', color: '#10B981', max_marks: 20, question_count: 20, shared_pool_key: 'reasoning', topics: reasoning_topics.slice(0, 8) }
    ]
  },

  // 6. Civil Services
  {
    slug: 'upsc_cse',
    name: 'UPSC CSE',
    full_name: 'Civil Services Examination (IAS / IPS / IFS)',
    conducting_body: 'UPSC',
    frequency: '1x / year',
    safe_cutoff: 94.5,
    category_slug: 'civil_services',
    tiers: [{ name: 'Prelims GS 1', max: 200 }, { name: 'Prelims CSAT', max: 200 }],
    marking_scheme: { correct: 2, wrong: -0.67, unattempted: 0 },
    subjects: [
      { name: 'General Studies I', slug: 'gs1', color: '#F97316', max_marks: 200, question_count: 100, shared_pool_key: 'upsc_gs', topics: upsc_gs_topics },
      { name: 'Aptitude CSAT (GS II)', slug: 'csat', color: '#3B82F6', max_marks: 200, question_count: 80, shared_pool_key: 'qa', topics: qa_topics }
    ]
  },
  {
    slug: 'state_psc',
    name: 'State PSC',
    full_name: 'MPSC, BPSC, UPPSC, TNPSC State Civil Services',
    conducting_body: 'State Commissions',
    frequency: 'Annual',
    safe_cutoff: 105.0,
    category_slug: 'civil_services',
    tiers: [{ name: 'Prelims Exam', max: 200 }],
    marking_scheme: { correct: 2, wrong: -0.67, unattempted: 0 },
    subjects: [
      { name: 'General Studies Paper', slug: 'gs', color: '#F97316', max_marks: 200, question_count: 100, shared_pool_key: 'gk', topics: gk_topics },
      { name: 'General Aptitude', slug: 'aptitude', color: '#3B82F6', max_marks: 200, question_count: 80, shared_pool_key: 'qa', topics: qa_topics }
    ]
  },
  {
    slug: 'upsc_cds',
    name: 'UPSC CDS',
    full_name: 'Combined Defence Services Examination',
    conducting_body: 'UPSC',
    frequency: '2x / year',
    safe_cutoff: 102.0,
    category_slug: 'civil_services',
    tiers: [{ name: 'IMA / INA / AFA Written', max: 300 }],
    marking_scheme: { correct: 1, wrong: -0.33, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#3B82F6', max_marks: 100, question_count: 100, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'English', slug: 'english', color: '#8B5CF6', max_marks: 100, question_count: 120, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Knowledge', slug: 'gk', color: '#EAB308', max_marks: 100, question_count: 120, shared_pool_key: 'gk', topics: gk_topics }
    ]
  },

  // 7. Management & Law
  {
    slug: 'cat',
    name: 'CAT',
    full_name: 'Common Admission Test — IIMs',
    conducting_body: 'IIMs',
    frequency: '1x / year',
    safe_cutoff: 98.0,
    category_slug: 'management_law',
    tiers: [{ name: 'CAT Exam', max: 198 }],
    marking_scheme: { correct: 3, wrong: -1, unattempted: 0 },
    subjects: [
      { name: 'Quantitative Ability', slug: 'qa', color: '#3B82F6', max_marks: 66, question_count: 22, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Verbal Ability & RC (VARC)', slug: 'varc', color: '#8B5CF6', max_marks: 72, question_count: 24, shared_pool_key: 'english', topics: english_topics },
      { name: 'Data Interpretation & LR', slug: 'lrdi', color: '#EAB308', max_marks: 60, question_count: 20, shared_pool_key: 'reasoning', topics: reasoning_topics }
    ]
  },
  {
    slug: 'clat',
    name: 'CLAT',
    full_name: 'Common Law Admission Test',
    conducting_body: 'NLUs',
    frequency: '1x / year',
    safe_cutoff: 82.5,
    category_slug: 'management_law',
    tiers: [{ name: 'CLAT Exam', max: 120 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: 0 },
    subjects: [
      { name: 'Legal Reasoning', slug: 'legal', color: '#F97316', max_marks: 32, question_count: 32, shared_pool_key: 'legal_law', topics: law_legal_topics },
      { name: 'English Language', slug: 'english', color: '#8B5CF6', max_marks: 24, question_count: 24, shared_pool_key: 'english', topics: english_topics },
      { name: 'General Knowledge & Current Affairs', slug: 'gk', color: '#EAB308', max_marks: 28, question_count: 28, shared_pool_key: 'gk', topics: gk_topics },
      { name: 'Quantitative Techniques', slug: 'qa', color: '#3B82F6', max_marks: 12, question_count: 12, shared_pool_key: 'qa', topics: qa_topics.slice(0, 6) }
    ]
  },
  {
    slug: 'xat_snap',
    name: 'XAT / SNAP',
    full_name: 'Xavier Aptitude Test / Symbiosis National Aptitude Test',
    conducting_body: 'XLRI / Symbiosis',
    frequency: '1x / year',
    safe_cutoff: 35.0,
    category_slug: 'management_law',
    tiers: [{ name: 'XAT Exam', max: 100 }],
    marking_scheme: { correct: 1, wrong: -0.25, unattempted: -0.1 },
    subjects: [
      { name: 'Quantitative Ability & DI', slug: 'qa', color: '#3B82F6', max_marks: 28, question_count: 28, shared_pool_key: 'qa', topics: qa_topics },
      { name: 'Decision Making', slug: 'dm', color: '#8B5CF6', max_marks: 21, question_count: 21, shared_pool_key: 'dm_scenarios', topics: management_dm_topics },
      { name: 'Verbal and Logical Ability', slug: 'varc', color: '#10B981', max_marks: 26, question_count: 26, shared_pool_key: 'english', topics: english_topics }
    ]
  },
  {
    slug: 'nda',
    name: 'NDA',
    full_name: 'National Defence Academy & Naval Academy Exam',
    conducting_body: 'UPSC',
    frequency: '2x / year',
    safe_cutoff: 360.0,
    category_slug: 'management_law',
    tiers: [{ name: 'Mathematics', max: 300 }, { name: 'General Ability Test', max: 600 }],
    marking_scheme: { correct: 2.5, wrong: -0.83, unattempted: 0 },
    subjects: [
      { name: 'Mathematics', slug: 'mathematics', color: '#EC4899', max_marks: 300, question_count: 120, shared_pool_key: 'maths_jee', topics: maths_jee_topics },
      { name: 'General Ability Test (English + GK)', slug: 'gat', color: '#8B5CF6', max_marks: 600, question_count: 150, shared_pool_key: 'gk', topics: gk_topics }
    ]
  }
];

export const seedDatabase = async () => {
  try {
    console.log('Starting Database Seeding...');
    await initDB();

    // 1. Seed Categories
    console.log('Seeding exam categories...');
    for (const cat of CATEGORIES) {
      await run(`
        INSERT INTO exam_categories (id, slug, label, icon, color_ramp, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          label=excluded.label,
          icon=excluded.icon,
          color_ramp=excluded.color_ramp,
          sort_order=excluded.sort_order;
      `, [cat.id, cat.slug, cat.label, cat.icon, cat.color_ramp, cat.sort_order]);
    }

    // Load created categories for foreign key mapping
    const categoriesRows = await query('SELECT id, slug FROM exam_categories');
    const categoryMap = {};
    categoriesRows.forEach(row => {
      categoryMap[row.slug] = row.id;
    });

    // 2. Seed Exams
    console.log('Seeding exams, subjects, and topics...');
    for (const examData of EXAMS) {
      const categoryId = categoryMap[examData.category_slug];
      if (!categoryId) {
        console.warn(`Category slug '${examData.category_slug}' not found for exam '${examData.slug}'. Skipping.`);
        continue;
      }

      // Check if exam already exists
      let examRow = await get('SELECT id FROM exams WHERE slug = ?', [examData.slug]);
      let examId;

      const tiersStr = JSON.stringify(examData.tiers);
      const markingSchemeStr = JSON.stringify(examData.marking_scheme);

      if (examRow) {
        examId = examRow.id;
        await run(`
          UPDATE exams SET
            category_id = ?,
            name = ?,
            full_name = ?,
            conducting_body = ?,
            frequency = ?,
            tiers = ?,
            marking_scheme = ?,
            safe_cutoff = ?
          WHERE id = ?
        `, [
          categoryId,
          examData.name,
          examData.full_name,
          examData.conducting_body,
          examData.frequency,
          tiersStr,
          markingSchemeStr,
          examData.safe_cutoff,
          examId
        ]);
      } else {
        examId = uuidv4();
        await run(`
          INSERT INTO exams (id, category_id, slug, name, full_name, conducting_body, frequency, tiers, marking_scheme, safe_cutoff, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          examId,
          categoryId,
          examData.slug,
          examData.name,
          examData.full_name,
          examData.conducting_body,
          examData.frequency,
          tiersStr,
          markingSchemeStr,
          examData.safe_cutoff
        ]);
      }

      // Seeding subjects for this exam
      let subjectOrder = 0;
      for (const subjData of examData.subjects) {
        subjectOrder++;

        // Check if subject exists
        let subjectRow = await get('SELECT id FROM exam_subjects WHERE exam_id = ? AND slug = ?', [examId, subjData.slug]);
        let subjectId;

        if (subjectRow) {
          subjectId = subjectRow.id;
          await run(`
            UPDATE exam_subjects SET
              name = ?,
              color = ?,
              max_marks = ?,
              question_count = ?,
              sort_order = ?,
              shared_pool_key = ?
            WHERE id = ?
          `, [
            subjData.name,
            subjData.color,
            subjData.max_marks,
            subjData.question_count,
            subjectOrder,
            subjData.shared_pool_key,
            subjectId
          ]);
        } else {
          subjectId = uuidv4();
          await run(`
            INSERT INTO exam_subjects (id, exam_id, name, slug, color, max_marks, question_count, sort_order, shared_pool_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            subjectId,
            examId,
            subjData.name,
            subjData.slug,
            subjData.color,
            subjData.max_marks,
            subjData.question_count,
            subjectOrder,
            subjData.shared_pool_key
          ]);
        }

        // Seeding topics for this subject
        let topicOrder = 0;
        for (const topicData of subjData.topics) {
          topicOrder++;

          // 2.1 Seed topic in the shared 'topics' table first
          let topicRow = await get(`
            SELECT id FROM topics
            WHERE pool_key = ? AND section = ? AND topic = ?
          `, [subjData.shared_pool_key, topicData.section, topicData.topic]);

          let topicId;
          if (topicRow) {
            topicId = topicRow.id;
            await run(`
              UPDATE topics SET
                subject_name = ?,
                difficulty = ?,
                avg_weightage = ?
              WHERE id = ?
            `, [
              subjData.name,
              topicData.difficulty || 'medium',
              topicData.weightage,
              topicId
            ]);
          } else {
            topicId = uuidv4();
            await run(`
              INSERT INTO topics (id, pool_key, subject_name, section, topic, is_template, difficulty, avg_weightage)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `, [
              topicId,
              subjData.shared_pool_key,
              subjData.name,
              topicData.section,
              topicData.topic,
              topicData.difficulty || 'medium',
              topicData.weightage
            ]);
          }

          // 2.2 Seed in the 'exam_topic_map' table (exam-specific priority & resource details)
          let mapRow = await get(`
            SELECT id FROM exam_topic_map
            WHERE exam_id = ? AND subject_id = ? AND topic_id = ?
          `, [examId, subjectId, topicId]);

          const priority = getPriorityVal(topicOrder);
          const resource = getResourceBook(examData.slug, subjData.slug, topicData.topic);

          if (mapRow) {
            await run(`
              UPDATE exam_topic_map SET
                priority = ?,
                recommended_resource = ?,
                resource_chapter = ?,
                sort_order = ?
              WHERE id = ?
            `, [
              priority,
              resource,
              `Ch. ${topicOrder}`,
              topicOrder,
              mapRow.id
            ]);
          } else {
            await run(`
              INSERT INTO exam_topic_map (id, exam_id, subject_id, topic_id, priority, recommended_resource, resource_chapter, sort_order, is_optional)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [
              uuidv4(),
              examId,
              subjectId,
              topicId,
              priority,
              resource,
              `Ch. ${topicOrder}`,
              topicOrder
            ]);
          }
        }
      }
    }

    console.log('Database Seeding finished successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
};

// Run seeder if script is run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
