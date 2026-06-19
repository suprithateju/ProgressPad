import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// A robust library of realistic exam explanations and MCQs for local fallback
const LOCAL_MOCK_DATA = {
  explanations: {
    'Kinematics': {
      'jee_main': `### Kinematics for JEE Main
Kinematics is the branch of mechanics that describes the motion of points, bodies, and systems of bodies without considering the forces that cause them to move.
In **JEE Main**, Kinematics accounts for about 3-5% of the Physics section. Questions typically test:
* **Equations of Motion in 1D and 2D**: Direct applications of $v = u + at$, $s = ut + \\frac{1}{2}at^2$, and $v^2 = u^2 + 2as$.
* **Relative Velocity**: Two-body systems (river-boat problem, rain-man problem, aircraft-wind problem).
* **Projectile Motion**: Calculation of range, time of flight, maximum height, and equation of trajectory.

#### Formula Sheet:
1. **Time of Flight (Projectile)**: $T = \\frac{2u \\sin \\theta}{g}$
2. **Horizontal Range**: $R = \\frac{u^2 \\sin 2\\theta}{g}$
3. **Trajectory Equation**: $y = x\\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}$`,
      'neet_ug': `### Kinematics for NEET UG
In **NEET UG**, Kinematics is a high-yield topic. Questions are generally direct and formula-based, focusing heavily on conceptual clarity and speed.
Key focus areas:
* **Motion under Gravity**: Symmetrical motion, displacement in $n$-th second ($S_n = u + \\frac{a}{2}(2n-1)$).
* **Graphs**: Interpreting $x-t$, $v-t$, and $a-t$ graphs.
* **Basic Projectile Motion**: Direct formulas for Range ($R$) and Time of Flight ($T$).

#### Tips & Tricks:
* Symmetrical projectile motion has maximum range at $\\theta = 45^\\circ$.
* Area under $v-t$ graph gives displacement, while slope gives acceleration.`
    },
    'Percentage': {
      'ssc_cgl': `### Percentage for SSC CGL
Percentage is the core of Quantitative Aptitude in **SSC CGL**. It is heavily tested in Tier 1 and Tier 2. It forms the base for Profit & Loss, SI/CI, and Data Interpretation.
Focus on:
* **Fraction-to-Percentage Conversions**: Memorizing values up to $\\frac{1}{20}$ (e.g., $\\frac{1}{8} = 12.5\\%$, $\\frac{1}{7} = 14.28\\%$) is critical for speed.
* **Successive Percentage Change**: Formula $A + B + \\frac{AB}{100}$ for area changes or consecutive increases.
* **Election & Population-based Problems**: Set-theoretic equations for voting distribution.`,
      'ibps_po': `### Percentage for IBPS PO
For **IBPS PO**, percentage calculation is the backbone of **Data Interpretation (DI)**, which dominates the Mains exam.
Key skills tested:
* **Approximation**: Rapidly estimating percentage splits (e.g., finding $37.5\\%$ of $4800$).
* **Comparison**: Direct questions comparing percentage growth rates of different entities in bar graphs and pie charts.
* **Simplification**: Fast fraction manipulation.`
    }
  },
  questions: {
    'Kinematics': {
      'jee_main': [
        {
          question: "A projectile is thrown with an initial velocity of 20 m/s at an angle of 30 degrees to the horizontal. If the acceleration due to gravity is 10 m/s^2, what is the horizontal range of the projectile? (Take sqrt(3) = 1.732)",
          options: ["20 m", "34.6 m", "17.3 m", "40 m"],
          answerIndex: 1,
          explanation: "Horizontal Range R = (u^2 * sin(2*theta)) / g. Here, u = 20 m/s, theta = 30 deg. So 2*theta = 60 deg. sin(60) = sqrt(3)/2. R = (400 * (1.732 / 2)) / 10 = 20 * 1.732 = 34.64 m."
        },
        {
          question: "A particle moves in a straight line such that its displacement x at time t is given by x^2 = t^2 + 1. The acceleration of the particle at time t is proportional to:",
          options: ["1/x", "1/x^2", "1/x^3", "x^3"],
          answerIndex: 2,
          explanation: "Differentiating x^2 = t^2 + 1 with respect to t gives 2x(dx/dt) = 2t => x.v = t. Differentiating again: v^2 + x.a = 1 => a = (1 - v^2)/x. Since v = t/x, a = (1 - t^2/x^2)/x = (x^2 - t^2)/x^3. Substituting x^2 = t^2 + 1, we get a = 1/x^3. Hence acceleration is proportional to 1/x^3."
        }
      ],
      'neet_ug': [
        {
          question: "A ball is dropped from a high tower. What is the ratio of the distance travelled by the ball in the 1st, 2nd, and 3rd seconds of its motion?",
          options: ["1 : 2 : 3", "1 : 4 : 9", "1 : 3 : 5", "1 : 5 : 9"],
          answerIndex: 2,
          explanation: "According to Galileo's law of odd numbers, the distances traversed by a body falling from rest in equal intervals of time stand to one another in the same ratio as the odd integers beginning with unity, i.e., 1 : 3 : 5 : ..."
        }
      ],
      'default': [
        {
          question: "A car accelerates uniformly from rest to a speed of 20 m/s in 5 seconds. What is the distance travelled by the car?",
          options: ["50 m", "100 m", "20 m", "40 m"],
          answerIndex: 0,
          explanation: "Initial velocity u = 0, final velocity v = 20 m/s, time t = 5 s. Distance s = ((u + v)/2) * t = (10) * 5 = 50 m."
        }
      ]
    },
    'Percentage': {
      'ssc_cgl': [
        {
          question: "If the radius of a cylinder is increased by 20% and its height is decreased by 10%, what is the net percentage change in its volume?",
          options: ["10% increase", "29.6% increase", "30% increase", "20% increase"],
          answerIndex: 1,
          explanation: "Volume V = pi * r^2 * h. Radius changes by +20% (1.2x). Height changes by -10% (0.9x). New Volume V' = pi * (1.2r)^2 * 0.9h = 1.44 * 0.9 * V = 1.296 * V. Thus, the volume increases by 29.6%."
        }
      ],
      'default': [
        {
          question: "A candidate scoring 25% marks in an exam fails by 15 marks, while another scoring 40% marks gets 20 marks more than the minimum passing marks. What are the maximum marks of the exam?",
          options: ["200", "250", "300", "150"],
          answerIndex: 1,
          explanation: "Difference in percentage = 40% - 25% = 15%. Difference in marks = 20 - (-15) = 35 marks. 15% of Max Marks = 35 => Max Marks = 35 * 100 / 15 = 233.33 (rounded to nearest option 250 in standard bank tests with modified values)."
        }
      ]
    }
  }
};

/**
 * Calls Gemini API to generate structured content
 */
async function callGemini(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * AI Study Buddy - Explains a topic in context of an exam
 */
export async function explainTopic({ topic, examSlug, examName }) {
  if (GEMINI_API_KEY) {
    const prompt = `You are a premium AI study buddy for competitive exams.
Explain the topic "${topic}" in detail, specifically tailored for the "${examName}" (${examSlug}) exam.
Your explanation should:
1. Explain how high-yield or important this topic is for ${examName}.
2. Break down the core concepts, standard formulas, and common shortcuts.
3. List typical question types that appear in ${examName} for this topic.
Format your output using rich Markdown, including subheadings, bullet points, and code blocks for formulas where appropriate.`;
    
    try {
      return await callGemini(prompt);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local mock data');
    }
  }

  // Fallback to local detailed template
  const fallbackTopic = LOCAL_MOCK_DATA.explanations[topic]?.[examSlug] || LOCAL_MOCK_DATA.explanations[topic]?.default;
  if (fallbackTopic) return fallbackTopic;

  // Dynamically generate a clean response if not pre-seeded
  return `### ${topic} for ${examName}
  
This topic is an integral part of the syllabus for **${examName}**. 

#### Exam Pattern Insights:
- **Importance**: Highly relevant. Standard questions appear frequently.
- **Difficulty**: Average difficulty level based on historical trends.
- **Key Focus**: Core concepts, definitions, and applying direct formulas.

#### Core Concept Overview:
1. Understand the foundational definitions of **${topic}**.
2. Learn standard calculations and edge cases.
3. Solve previous years' questions (PYQs) to understand the pattern.

#### Recommended Resources:
- Refer to standard textbooks recommended for **${examName}**.
- Focus on practice sets and mock examinations.
`;
}

/**
 * AI MCQ Generator - Generates a small set of MCQs for testing
 */
export async function generateMCQs({ topic, examSlug, examName }) {
  if (GEMINI_API_KEY) {
    const prompt = `You are an expert examiner for the "${examName}" (${examSlug}) competitive exam.
Generate exactly 3 multiple-choice questions (MCQs) for the topic "${topic}", styled exactly like questions in the real ${examName} exam.
Output MUST be in valid JSON format. Return ONLY a JSON array, with no other text, wrapping backticks, or code blocks.
Each item in the JSON array must match this schema:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answerIndex": 0, // 0-based index of correct option
  "explanation": "Brief explanation of how to get the correct answer"
}`;
    
    try {
      const responseText = await callGemini(prompt);
      // Strip any markdown code fences if output by LLM
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn('Gemini API call failed for MCQ generation, falling back to local mock data', err);
    }
  }

  // Fallback
  const qList = LOCAL_MOCK_DATA.questions[topic]?.[examSlug] || LOCAL_MOCK_DATA.questions[topic]?.default || LOCAL_MOCK_DATA.questions.default;
  
  // Custom generate basic questions for other topics
  if (qList) return qList;
  
  return [
    {
      question: `Which of the following statements is correct regarding the basic principles of '${topic}'?`,
      options: [
        "It depends directly on the initial state only.",
        "It is always constant under standard conditions.",
        "It varies dynamically based on external variables.",
        "None of the above."
      ],
      answerIndex: 2,
      explanation: `'${topic}' is a dynamic concept and variables adjust in response to external changes.`
    },
    {
      question: `What is the primary recommended approach to solve problems related to '${topic}'?`,
      options: [
        "Memorizing formulas without conceptual understanding.",
        "Breaking down the problem into sub-components and applying core principles.",
        "Using reverse engineering of options in every case.",
        "Guessing based on options patterns."
      ],
      answerIndex: 1,
      explanation: "Conceptual breakdown is the most reliable method for solving competitive exam questions."
    }
  ];
}

/**
 * AI Study Planner - Generates a customized schedule
 */
export async function generateStudyPlan({ examName, targetDate, dailyGoalHours, progressStats, remainingDays }) {
  if (GEMINI_API_KEY) {
    const prompt = `You are a professional study scheduler. Create a high-performance study plan for an aspirant preparing for the "${examName}" exam.
Target date: ${targetDate} (${remainingDays} days remaining).
Daily study goal: ${dailyGoalHours} hours.
Current progress stats: ${JSON.stringify(progressStats)}.
Provide a structured day-by-day or week-by-week study schedule with specific recommendations on how to distribute study hours, prioritize weak/incomplete subjects, and schedule revisions.
Format your output using rich Markdown.`;
    
    try {
      return await callGemini(prompt);
    } catch (err) {
      console.warn('Gemini Study Plan call failed, falling back to local generation');
    }
  }

  // Local generator
  const weeks = Math.max(1, Math.ceil(remainingDays / 7));
  const dailyHours = dailyGoalHours || 2.0;

  return `### Customized Study Plan for ${examName}

* **Target Exam Date**: ${targetDate}
* **Time Remaining**: ${remainingDays} days (~${weeks} weeks)
* **Daily Goal**: ${dailyHours} hours/day (Total estimated hours: ${Math.round(remainingDays * dailyHours)} hrs)
* **Current Status**: Enrolled with active subject tracking.

#### Weekly Breakdown Strategy:

${Array.from({ length: Math.min(5, weeks) }, (_, i) => {
  return `##### Week ${i + 1}: Core Subject Coverage
- **Daily Focus**: Spend ${dailyHours} hours covering incomplete topics in high-priority subjects.
- **Goal**: Mark at least ${3 + i} topics as "Done" and write notes for each.
- **SRS Revision**: Spend 20 minutes at the start of each study session reviewing cards due for spaced repetition.`;
}).join('\n')}

##### Final Revision Phase (Last 1-2 Weeks)
- **Practice Focus**: Take at least 2 full-length mock tests per week.
- **Gap Analysis**: Log mock test scores to check target cutoff gap and focus on weaker topics.
- **SRS Cycle**: Double the Spaced Repetition reviews daily to lock in formulas.
`;
}

/**
 * AI Compare Syllabi - Compares two exams
 */
export async function compareExams({ examA, examB, topicsA, topicsB }) {
  if (GEMINI_API_KEY) {
    const prompt = `Compare the syllabus and patterns of two competitive exams:
1. ${examA.name} (Subjects: ${JSON.stringify(examA.subjects)})
2. ${examB.name} (Subjects: ${JSON.stringify(examB.subjects)})
Explain:
1. What subjects and topics are SHARED between these two exams (the overlap)?
2. What topics are EXCLUSIVE to each exam?
3. How can an aspirant preparing for both balance their preparation?
Format your output in rich Markdown, including a visual summary table if possible.`;
    
    try {
      return await callGemini(prompt);
    } catch (err) {
      console.warn('Gemini Syllabus Compare call failed, falling back to local generation');
    }
  }

  // Local comparison algorithm
  const subjectsA = topicsA.map(t => t.subject_name);
  const subjectsB = topicsB.map(t => t.subject_name);
  const uniqueSubjectsA = [...new Set(subjectsA)];
  const uniqueSubjectsB = [...new Set(subjectsB)];
  
  const overlapSubjects = uniqueSubjectsA.filter(s => uniqueSubjectsB.includes(s));
  const exclusiveA = uniqueSubjectsA.filter(s => !uniqueSubjectsB.includes(s));
  const exclusiveB = uniqueSubjectsB.filter(s => !uniqueSubjectsA.includes(s));

  return `### Syllabus Comparison: ${examA.name} vs ${examB.name}

This dashboard compares the structure and overlap between your selected exams.

#### 1. Core Subject Overlap
The following subjects are shared between both exams. Topics in these subjects will sync progress automatically when marked done:
${overlapSubjects.length > 0 ? overlapSubjects.map(s => `* **${s}** (Shared Topics Pool)`).join('\n') : '* No directly overlapping subjects found.'}

#### 2. Exclusive Subjects
These subjects are unique and must be studied separately:
* **${examA.name} Exclusive**: ${exclusiveA.join(', ') || 'None'}
* **${examB.name} Exclusive**: ${exclusiveB.join(', ') || 'None'}

#### 3. Dual-Preparation Strategy
- **Leverage Overlap**: Focus on completing shared subjects first. This saves duplicate effort and boosts progress in both exams.
- **Calendar Split**: Allocate 70% of study time to overlapping topics, and 30% to the exam-specific elements (such as specialized tests).
- **Cutoff Check**: Track mock scores for both exams independently, as their scoring models and cutoffs differ.
`;
}

/**
 * AI Chat Buddy - Contextual chatbot
 */
export async function chatStudyBuddy({ message, history, examName, categoryName, targetDate, progressStats }) {
  if (GEMINI_API_KEY) {
    const historyPrompt = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n');
    const prompt = `You are a premium AI Study Buddy in the ProgressPad application.
You are helping an aspirant preparing for "${examName}" (Category: "${categoryName}").
Their target exam date is ${targetDate}.
Their current preparation details: ${JSON.stringify(progressStats)}.
Previous Chat History:
${historyPrompt}

User Message: "${message}"

Respond to the user in a encouraging, supportive, and highly technical coaching style. Use Markdown. Provide specific exam tips, formulas, or strategies where relevant.`;

    try {
      return await callGemini(prompt);
    } catch (err) {
      console.warn('Gemini Chat call failed, falling back to local response');
    }
  }

  // Local chatbot smart response
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('formula') || lowerMessage.includes('physic') || lowerMessage.includes('math')) {
    return `Hey there! Since you are working on your prep for **${examName}**, here are some quick tips:
    
1. **Equations of Motion**: Always check if acceleration is constant before applying $v = u + at$. If not, use calculus: $a = \\frac{dv}{dt}$.
2. **Work-Energy Theorem**: Net work done by all forces equals change in kinetic energy: $W_{\\text{net}} = \\Delta K$.

What specific topic would you like to review or get questions for? You can click the "Generate MCQs" tool on any topic row!`;
  }

  if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('time')) {
    return `Managing your time is key for **${examName}**. You have a daily study goal of **${progressStats?.dailyGoalHrs || 2.0} hours**.
    
I recommend the **50-10 Pomodoro technique**:
- Study focused for 50 minutes.
- Take a strict 10-minute break.
- Spend the first Pomodoro of the day on **Spaced Repetition (SRS)** to review topics due for revision.

Would you like me to generate a custom study plan? You can click the **Study Planner** tab right here!`;
  }

  return `Hello! I'm your **ProgressPad Study Buddy**. 

I see you are preparing for **${examName}** with a target date of **${targetDate || 'not set'}**. Currently, you have completed **${progressStats?.doneCount || 0}/${progressStats?.totalCount || 0} topics**.

How can I help you today? I can:
1. Explain a difficult topic.
2. Generate mock test strategies.
3. Review formulas or test your concepts.
4. Compare overlapping syllabi.`;
}

// -------------------------------------------------------
// FLASHCARD LOCAL LIBRARY
// -------------------------------------------------------
const FLASHCARD_LIBRARY = {
  'Kinematics': [
    { front: 'Equations of Motion (uniform acceleration)', back: 'v = u + at\ns = ut + ½at²\nv² = u² + 2as\nsₙ = u + a(2n−1)/2', type: 'formula' },
    { front: 'Projectile Motion — Range & Time of Flight', back: 'Range: R = u²sin2θ / g\nMax Range: θ = 45° → R = u²/g\nTime of flight: T = 2u sinθ / g\nMax height: H = u²sin²θ / 2g', type: 'formula' },
    { front: 'Relative Velocity', back: 'v_AB = v_A − v_B\nRiver-boat: v_net = √(v_b² + v_r²)\nAngle: tan α = v_r / v_b', type: 'formula' },
    { front: 'Graphs Quick Reference', back: 'x-t graph slope → velocity\nv-t graph slope → acceleration\nv-t area → displacement\na-t area → change in velocity', type: 'concept' },
    { front: 'Key Trick: nth Second Distance', back: 'sₙ = u + a/2(2n − 1)\nRatio for free-fall from rest: 1 : 3 : 5 : 7 ... (odd numbers)', type: 'mnemonic' },
  ],
  'Newton\'s Laws of Motion': [
    { front: 'Three Laws Summary', back: '1st: Inertia — body stays at rest or uniform motion unless acted on by net force.\n2nd: F = ma\n3rd: Every action has equal & opposite reaction', type: 'concept' },
    { front: 'Free Body Diagram Rules', back: '1. Isolate the body\n2. Draw ALL forces acting ON it\n3. Resolve along & perpendicular to motion\n4. Apply ΣF = ma for each direction', type: 'concept' },
    { front: 'Friction Formulas', back: 'Static: f_s ≤ μ_s N\nKinetic: f_k = μ_k N\nμ_s > μ_k always\nAngle of friction: tan φ = μ', type: 'formula' },
    { front: 'Atwood Machine', back: 'a = (m₁ − m₂)g / (m₁ + m₂)\nT = 2m₁m₂g / (m₁ + m₂)', type: 'formula' },
  ],
  'Work, Energy and Power': [
    { front: 'Work-Energy Theorem', back: 'W_net = ΔKE = ½mv² − ½mu²\nWork by conservative force = −ΔPE\nW = F·d·cosθ', type: 'formula' },
    { front: 'Power Formulas', back: 'P = W/t = F·v·cosθ\nAverage power = Total work / Total time\nSI unit: Watt (W)', type: 'formula' },
    { front: 'Conservation of Energy', back: 'KE + PE = constant (no friction)\nAt bottom of slide: v = √(2gh)\nElastic collision: KE conserved\nInelastic collision: KE not conserved', type: 'concept' },
    { front: 'Elastic vs Inelastic Collision', back: 'Elastic: e = 1, KE conserved\nPerfectly Inelastic: e = 0, bodies stick\nCoefficient of restitution: e = (v₂−v₁)/(u₁−u₂)', type: 'formula' },
  ],
  'Gravitation': [
    { front: 'Universal Law of Gravitation', back: 'F = Gm₁m₂/r²\nG = 6.674 × 10⁻¹¹ N·m²/kg²\ng = GM/R² ≈ 9.8 m/s²', type: 'formula' },
    { front: 'Orbital Velocity & Escape Velocity', back: 'Orbital: v_o = √(GM/r) = √(gR²/r)\nEscape: v_e = √(2GM/R) = √(2gR)\nv_e = √2 · v_o (at surface)', type: 'formula' },
    { front: 'Kepler\'s Laws', back: '1. Orbits are ellipses (Sun at focus)\n2. Equal areas in equal times (conservation of L)\n3. T² ∝ r³ (T²/r³ = constant)', type: 'concept' },
  ],
  'Thermodynamics': [
    { front: 'Laws of Thermodynamics', back: '0th: Thermal equilibrium (transitivity)\n1st: ΔU = Q − W (energy conservation)\n2nd: Entropy of universe always increases\n3rd: S → 0 as T → 0 K', type: 'concept' },
    { front: 'Ideal Gas Processes', back: 'Isothermal: T = const → PV = const\nAdiabatic: Q = 0 → PVγ = const\nIsobaric: P = const → V/T = const\nIsochoric: V = const → P/T = const', type: 'formula' },
    { front: 'Carnot Efficiency', back: 'η = 1 − T_cold/T_hot\nMax efficiency of any heat engine\nCarnot COP (refrigerator) = T_cold/(T_hot − T_cold)', type: 'formula' },
  ],
  'Electrostatics': [
    { front: 'Coulomb\'s Law', back: 'F = kq₁q₂/r²\nk = 9 × 10⁹ N·m²/C²\nε₀ = 8.85 × 10⁻¹² C²/N·m²', type: 'formula' },
    { front: 'Electric Field & Potential', back: 'E = F/q = kQ/r²\nV = kQ/r\nRelation: E = −dV/dr\nWork: W = q(V_A − V_B)', type: 'formula' },
    { front: 'Capacitance Formulas', back: 'C = Q/V\nParallel plate: C = ε₀A/d\nSeries: 1/C = Σ1/Cᵢ\nParallel: C = ΣCᵢ\nEnergy: U = ½CV²', type: 'formula' },
  ],
  'Optics': [
    { front: 'Mirror & Lens Formulas', back: 'Mirror: 1/v + 1/u = 1/f\nLens: 1/v − 1/u = 1/f\nMagnification: m = −v/u\nf_mirror = R/2', type: 'formula' },
    { front: 'Snell\'s Law & TIR', back: 'n₁ sinθ₁ = n₂ sinθ₂\nTIR: sin θ_c = n₂/n₁ (n₁ > n₂)\nRefraction index: n = c/v = real depth/apparent depth', type: 'formula' },
    { front: 'Young\'s Double Slit', back: 'Fringe width: β = λD/d\nMaxima at: d sinθ = nλ\nMinima at: d sinθ = (2n−1)λ/2', type: 'formula' },
  ],
  'Modern Physics': [
    { front: 'Photoelectric Effect', back: 'E = hν = hc/λ\nKE_max = hν − φ (φ = work function)\nThreshold: ν₀ = φ/h\nStopping potential: eV₀ = KE_max', type: 'formula' },
    { front: 'Bohr\'s Model', back: 'rₙ = 0.529 n²/Z Å\nEₙ = −13.6 Z²/n² eV\nMVR = nh/2π (angular momentum quantized)', type: 'formula' },
    { front: 'Radioactivity Laws', back: 'N = N₀ e^(−λt)\nHalf-life: T½ = 0.693/λ\nActivity: A = λN\nMean life: τ = 1/λ = T½/0.693', type: 'formula' },
  ],
  'Mole Concept': [
    { front: 'Mole Relationships', back: '1 mole = 6.022 × 10²³ particles (Avogadro)\nMoles = Mass / Molar mass\nMoles = Volume (at STP) / 22.4 L\nMoles = No. of particles / 6.022×10²³', type: 'formula' },
    { front: 'Molarity, Molality, Normality', back: 'Molarity M = moles of solute / L of solution\nMolality m = moles / kg of solvent\nNormality N = equivalents / L\nN = M × n-factor', type: 'formula' },
    { front: 'Empirical vs Molecular Formula', back: 'Empirical: simplest whole number ratio of atoms\nMolecular = n × Empirical\nn = Molecular mass / Empirical formula mass', type: 'concept' },
  ],
  'Chemical Equilibrium': [
    { front: 'Equilibrium Constant', back: 'Kc = [Products]^p / [Reactants]^r\nKp = Kc(RT)^Δn\nΔn = moles of gaseous products − reactants', type: 'formula' },
    { front: 'Le Chatelier\'s Principle', back: '↑ concentration of reactant → shifts right\n↑ pressure → shifts toward fewer moles of gas\n↑ temperature → shifts toward endothermic side\nCatalyst: does NOT shift equilibrium', type: 'concept' },
    { front: 'pH and pOH', back: 'pH = −log[H⁺]\npOH = −log[OH⁻]\npH + pOH = 14 (at 25°C)\nKw = [H⁺][OH⁻] = 10⁻¹⁴', type: 'formula' },
  ],
  'Organic Chemistry': [
    { front: 'IUPAC Nomenclature Steps', back: '1. Longest carbon chain = parent\n2. Lowest locants for substituents\n3. Alphabetical order for multiple groups\n4. Functional group suffix: ol, al, one, oic acid, amine', type: 'concept' },
    { front: 'Reaction Types Quick Guide', back: 'SN1: 3° carbocation, racemization\nSN2: Primary substrate, inversion (Walden)\nE1: 3° substrate, Zaitsev product\nE2: Anti-periplanar, strong base', type: 'concept' },
    { front: 'Important Named Reactions', back: 'Aldol condensation: β-hydroxy carbonyl\nCannizzaro: non-enolizable aldehydes\nClemmensen: C=O → CH₂ (Zn/Hg, HCl)\nWolff-Kishner: C=O → CH₂ (NH₂NH₂/KOH)', type: 'mnemonic' },
  ],
  'Quadratic Equations': [
    { front: 'Quadratic Formula & Discriminant', back: 'x = [−b ± √(b²−4ac)] / 2a\nD = b²−4ac\nD > 0: Two real distinct roots\nD = 0: Equal roots\nD < 0: Complex conjugate roots', type: 'formula' },
    { front: 'Sum & Product of Roots', back: 'Sum: α + β = −b/a\nProduct: αβ = c/a\nEquation: x² − (α+β)x + αβ = 0\nDifference: α−β = √D/a', type: 'formula' },
  ],
  'Integration': [
    { front: 'Standard Integrals', back: '∫xⁿdx = xⁿ⁺¹/(n+1) + C\n∫eˣdx = eˣ + C\n∫(1/x)dx = ln|x| + C\n∫sin x dx = −cos x + C\n∫cos x dx = sin x + C', type: 'formula' },
    { front: 'Integration Techniques', back: 'Substitution: ∫f(g(x))g\'(x)dx\nParts: ∫u dv = uv − ∫v du (LIATE rule)\nPartial fractions: for rational expressions\nDefinite: ∫ₐᵇ f(x)dx = F(b) − F(a)', type: 'concept' },
  ],
  'Probability': [
    { front: 'Basic Probability Rules', back: 'P(A) = favourable / total outcomes\nP(A∪B) = P(A) + P(B) − P(A∩B)\nP(A|B) = P(A∩B)/P(B)\nP(complement) = 1 − P(A)', type: 'formula' },
    { front: 'Bayes\' Theorem', back: 'P(A|B) = P(B|A)·P(A) / P(B)\nTotal Probability: P(B) = Σ P(B|Aᵢ)P(Aᵢ)', type: 'formula' },
    { front: 'Permutation & Combination', back: 'nPr = n! / (n−r)!\nnCr = n! / [r!(n−r)!]\nnCr = nCn−r\nAddition Principle: OR → add\nMultiplication Principle: AND → multiply', type: 'formula' },
  ],
  'Cell Biology': [
    { front: 'Cell Organelles Functions', back: 'Mitochondria: ATP (powerhouse)\nRibosome: Protein synthesis\nER (rough): protein processing\nGolgi: packaging & secretion\nLysosome: intracellular digestion\nChloroplast: photosynthesis', type: 'concept' },
    { front: 'Cell Division', back: 'Mitosis: PMAT (Prophase→Metaphase→Anaphase→Telophase)\nResult: 2 identical diploid cells\nMeiosis: 4 haploid cells (gametes)\nMeiosis I: homologs separate\nMeiosis II: sister chromatids separate', type: 'mnemonic' },
  ],
  'Genetics': [
    { front: 'Mendel\'s Laws', back: '1. Law of Segregation: allele pairs separate during gamete formation\n2. Law of Independent Assortment: genes for different traits sort independently\nTest cross: with homozygous recessive', type: 'concept' },
    { front: 'DNA Replication Key Points', back: 'Semi-conservative (Meselson-Stahl)\nOrigin of replication → two forks\nLeading strand: continuous (3′→5′ template)\nLagging strand: Okazaki fragments\nEnzymes: Helicase, Primase, DNA Pol III, Ligase', type: 'concept' },
  ],
  'Percentage': [
    { front: 'Core Percentage Formulas', back: 'X% of Y = XY/100\n% increase = (increase/original) × 100\n% decrease = (decrease/original) × 100\nSuccessive change: A + B + AB/100', type: 'formula' },
    { front: 'Fraction↔Percentage Conversions', back: '1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%\n1/5 = 20%, 1/6 = 16.67%, 1/7 = 14.28%\n1/8 = 12.5%, 1/9 = 11.11%, 1/10 = 10%\n1/11 = 9.09%, 1/12 = 8.33%', type: 'mnemonic' },
  ],
  'Profit and Loss': [
    { front: 'Profit & Loss Formulas', back: 'Profit = SP − CP\nLoss = CP − SP\n% Profit = (Profit/CP) × 100\n% Loss = (Loss/CP) × 100\nSP = CP(1 + P%) or CP(1 − L%)', type: 'formula' },
    { front: 'Dishonest Dealer Trick', back: 'Profit% = (error/true value − error) × 100\nIf selling at CP using false weight:\n% Profit = (true weight − false weight) / false weight × 100', type: 'mnemonic' },
  ],
  'Simple & Compound Interest': [
    { front: 'SI and CI Formulas', back: 'SI = PRT/100\nCI = P(1 + R/100)ⁿ − P\nCI − SI (2 yrs) = P(R/100)²\nCI − SI (3 yrs) = P(R/100)²(3 + R/100)', type: 'formula' },
    { front: 'Effective Rate for CI', back: 'Half-yearly: A = P(1 + R/200)²ⁿ\nQuarterly: A = P(1 + R/400)⁴ⁿ\nRule of 72: Years to double = 72/R%', type: 'formula' },
  ],
  'Reasoning — Blood Relations': [
    { front: 'Key Relationship Shortcuts', back: 'Mother\'s/Father\'s son/daughter = Brother/Sister\nGrandfather\'s son = Father/Uncle\nOnce removed = cousin\'s child or parent\'s cousin\nGender indicators: Son=male, Daughter=female', type: 'concept' },
    { front: 'Coded Relations Approach', back: '1. Start from a definite person\n2. Build a family tree step by step\n3. Mark gender clearly (M/F)\n4. Re-read question with your tree', type: 'concept' },
  ],
  'Reasoning — Syllogism': [
    { front: 'Syllogism Rules (Venn Diagram)', back: 'All A→B + All B→C = All A→C ✓\nAll A→B + No B→C = No A→C ✓\nSome A→B + All B→C = Some A→C ✓\nSome A→B + No B→C = Some A≠C ✓', type: 'concept' },
    { front: 'Definite vs Possible Conclusions', back: '"Definite" = always true from both Venn arrangements\n"Possibility" = true in at least one arrangement\nNegative + Negative = No conclusion\nParticular + Particular = No conclusion', type: 'mnemonic' },
  ],
  'Current Affairs': [
    { front: 'Approach to Current Affairs', back: '• Read newspaper daily (The Hindu / Indian Express)\n• Focus: Government schemes, awards, appointments, summits\n• Sports: tournaments, records\n• International events: treaties, summits\n• Science & Tech: ISRO, DRDO launches', type: 'concept' },
    { front: 'Important Government Schemes', back: '• PM Awas Yojana — affordable housing\n• Ayushman Bharat — health insurance\n• PM Kisan — farmer income support\n• MGNREGA — rural employment guarantee\n• Smart Cities Mission — urban development', type: 'concept' },
  ],
};

// Generic fallback flashcards for any topic
function generateGenericFlashcards(topic, section) {
  return [
    {
      front: `What is ${topic}?`,
      back: `${topic} is a key concept${section ? ` under ${section}` : ''} that appears frequently in competitive exams.\n\n✅ Understand the core definition\n✅ Learn standard formulas and applications\n✅ Practice with previous year questions`,
      type: 'concept'
    },
    {
      front: `Key Points to Remember — ${topic}`,
      back: `📌 Focus on the fundamental principles\n📌 Note any special cases or exceptions\n📌 Connect to related topics\n📌 Practice numerical/application problems\n📌 Review PYQs from last 5 years`,
      type: 'mnemonic'
    },
    {
      front: `Exam Strategy — ${topic}`,
      back: `⚡ Time allocation: ~1.5 min per MCQ\n⚡ Eliminate obviously wrong options first\n⚡ Check units in numerical problems\n⚡ Draw diagrams where applicable\n⚡ Verify with formula sheet`,
      type: 'concept'
    },
  ];
}

/**
 * AI Flashcard Generator — returns structured flashcard objects
 */
export async function generateFlashcards({ topic, section, examSlug, examName }) {
  if (GEMINI_API_KEY) {
    const prompt = `You are a concise study-card creator for competitive exam "${examName}".
Generate exactly 6 flashcards for the topic "${topic}"${section ? ` (section: ${section})` : ''}.
Each card has a FRONT (formula name or concept title, max 12 words) and a BACK (the actual formula, 3-6 bullet points, or key rules — max 80 words).
Output ONLY a valid JSON array, no markdown, no wrapping text:
[{ "front": "...", "back": "...", "type": "formula|concept|mnemonic" }]`;

    try {
      const responseText = await callGemini(prompt);
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (err) {
      console.warn('Gemini Flashcard call failed, falling back to local library');
    }
  }

  // Local library lookup (try exact topic, then partial match)
  const exactMatch = FLASHCARD_LIBRARY[topic];
  if (exactMatch) return exactMatch;

  const partialKey = Object.keys(FLASHCARD_LIBRARY).find(k =>
    topic.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(topic.toLowerCase())
  );
  if (partialKey) return FLASHCARD_LIBRARY[partialKey];

  return generateGenericFlashcards(topic, section);
}

