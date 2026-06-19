# 📊 ProgressPad

**ProgressPad** is a premium, device-friendly study planner and syllabus tracker designed for competitive exam aspirants (JEE, NEET, SSC CGL, RRB NTPC, IBPS PO, UPSC, CAT). It helps students keep track of vast syllabi, calculate study statistics, log mock tests against cutoff benchmarks, and retain concepts using an **SM-2 Spaced Repetition System (SRS)**.

It also integrates an **AI Study Space** equipped with a Study Coach Chat, AI topic describer, interactive MCQ quiz generator, and custom study planner (running via Gemini API or a robust local fallback generator).

---

## ✨ Key Features

- **📱 Fully Responsive Mobile Layout**: Displays a sleek bottom navigation bar on mobile viewports to toggle views between Progress stats, Syllabus boards, and Mock logging.
- **📋 Subject Kanban Boards**: Visualizes active preparation categories as interactive lists with custom priorities, status indicators, and offline 🃏 **Flashcards** decks.
- **🧠 Spaced Repetition (SM-2 Algorithm)**: Log and review topics with difficulty calibration (1-5 star ratings) to schedule dynamic revision intervals.
- **📈 Mock Analyzer & Cutoff Tracker**: Input mock scores in a touchscreen-friendly subject grid, plot cutoff gaps, and identify preparation weak areas.
- **✨ Exam-Context Aware AI Space**: Explains complex formulas, creates custom schedules, and challenges students with live-graded quizzes.
- **⚡ Cross-Exam Sync**: Shared subjects/topics automatically sync completion status across multiple enrolled exams.

---

## 🏗️ Technology Stack

- **Frontend**: Vite + React + Vanilla CSS (Custom glassmorphic dark/light accents)
- **Backend**: Node.js + Express.js
- **Database**: SQLite (Zero-dependency portable relational database, self-seeds on startup)
- **AI Engine**: Google Gemini API (with robust local mock fallbacks if offline)

---

## 🛠️ Local Installation & Running

1. **Install Dependencies**:
   ```bash
   npm run install-all
   ```

2. **Run Development Servers**:
   ```bash
   npm run dev
   ```
   - Frontend runs at `http://localhost:5173/`
   - Backend runs at `http://localhost:5000/`

3. **Configure Gemini API** (Optional):
   Create a `.env` file in the `backend/` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

## 🚀 Cloud Deployment

### 1. Backend (Render)
- **Runtime**: `Node`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment Variables**: Add `GEMINI_API_KEY` (optional).

### 2. Frontend (Vercel)
- **Framework Preset**: `Vite`
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add `VITE_BACKEND_URL` pointing to your Render backend web service.
