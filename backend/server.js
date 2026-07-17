import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { initDB, query, get, run } from './database.js';
import { seedDatabase } from './seed.js';
import { saveUserCloudBackup, restoreUserCloudBackup } from './cloud_backup.js';
import {
  explainTopic,
  generateMCQs,
  generateStudyPlan,
  compareExams,
  chatStudyBuddy,
  generateFlashcards
} from './ai_service.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Middleware to retrieve user email for multi-user isolation
app.use((req, res, next) => {
  req.userId = req.headers['x-user-email'] || '1';
  next();
});

// Initialize Database & Seed data on startup in the background
// This prevents blocking the server startup and port listening, avoiding Render timeouts.
initDB()
  .then(() => {
    return seedDatabase();
  })
  .catch(err => {
    console.error('Failed to initialize or seed database during startup:', err);
  });


// ----------------------------------------------------
// EXAM REGISTRY ENDPOINTS
// ----------------------------------------------------

// Get all exam categories with counts of active exams
app.get('/api/exams/categories', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM exam_categories ORDER BY sort_order');
    const counts = await query(`
      SELECT category_id, COUNT(*) as count 
      FROM exams 
      WHERE is_active = 1 
      GROUP BY category_id
    `);

    const countMap = {};
    counts.forEach(c => { countMap[c.category_id] = c.count; });

    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      examCount: countMap[cat.id] || 0
    }));

    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all exams, optional filtering by category slug
app.get('/api/exams', async (req, res) => {
  try {
    const { category } = req.query;
    let exams;
    if (category) {
      exams = await query(`
        SELECT e.* 
        FROM exams e
        JOIN exam_categories c ON e.category_id = c.id
        WHERE c.slug = ? AND e.is_active = 1
      `, [category]);
    } else {
      exams = await query('SELECT * FROM exams WHERE is_active = 1');
    }

    // Parse tiers and marking scheme from JSON string
    const parsedExams = exams.map(e => ({
      ...e,
      tiers: e.tiers ? JSON.parse(e.tiers) : [],
      marking_scheme: e.marking_scheme ? JSON.parse(e.marking_scheme) : {}
    }));

    res.json(parsedExams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed info of a single exam by slug
app.get('/api/exams/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const exam = await get('SELECT * FROM exams WHERE slug = ?', [slug]);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const subjects = await query(`
      SELECT * FROM exam_subjects 
      WHERE exam_id = ? 
      ORDER BY sort_order
    `, [exam.id]);

    res.json({
      ...exam,
      tiers: exam.tiers ? JSON.parse(exam.tiers) : [],
      marking_scheme: exam.marking_scheme ? JSON.parse(exam.marking_scheme) : {},
      subjects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get full syllabus (subjects + topics + resources) for a specific exam slug
app.get('/api/exams/:slug/syllabus', async (req, res) => {
  try {
    const { slug } = req.params;
    const exam = await get('SELECT * FROM exams WHERE slug = ?', [slug]);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const subjects = await query(`
      SELECT * FROM exam_subjects 
      WHERE exam_id = ? 
      ORDER BY sort_order
    `, [exam.id]);

    const syllabus = [];

    for (const subject of subjects) {
      const topics = await query(`
        SELECT t.*, m.priority, m.recommended_resource, m.resource_chapter, m.sort_order as map_order, m.is_optional
        FROM exam_topic_map m
        JOIN topics t ON m.topic_id = t.id
        WHERE m.exam_id = ? AND m.subject_id = ?
        ORDER BY m.sort_order
      `, [exam.id, subject.id]);

      syllabus.push({
        ...subject,
        topics
      });
    }

    res.json(syllabus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// USER EXAM ENROLLMENT MANAGEMENT
// ----------------------------------------------------

// Get database status type
app.get('/api/db-status', (req, res) => {
  res.json({ dbType: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite' });
});

// Get all enrolled exams the user is tracking
app.get('/api/users/me/exams', async (req, res) => {
  try {
    let enrolled = await query(`
      SELECT ue.*, e.name as exam_name, e.slug as exam_slug, e.full_name as exam_full_name, e.conducting_body, e.safe_cutoff, c.label as category_label, c.color_ramp as category_color_ramp
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      JOIN exam_categories c ON e.category_id = c.id
      WHERE ue.user_id = ?
    `, [req.userId]);

    // If user is logged in and has no records, try restoring from cloud backup
    if (enrolled.length === 0 && req.userId && req.userId !== '1') {
      const restored = await restoreUserCloudBackup(req.userId);
      if (restored) {
        // Query again after restore
        enrolled = await query(`
          SELECT ue.*, e.name as exam_name, e.slug as exam_slug, e.full_name as exam_full_name, e.conducting_body, e.safe_cutoff, c.label as category_label, c.color_ramp as category_color_ramp
          FROM user_exams ue
          JOIN exams e ON ue.exam_id = e.id
          JOIN exam_categories c ON e.category_id = c.id
          WHERE ue.user_id = ?
        `, [req.userId]);
      }
    }

    const result = [];

    for (const ue of enrolled) {
      // Calculate completion stats for this exam
      const totalTopicsRow = await get(`
        SELECT COUNT(*) as count 
        FROM exam_topic_map 
        WHERE exam_id = ?
      `, [ue.exam_id]);

      const doneTopicsRow = await get(`
        SELECT COUNT(*) as count 
        FROM user_topic_progress 
        WHERE user_exam_id = ? AND done = 1
      `, [ue.id]);

      // Calculate mock test average
      const mockAvgRow = await get(`
        SELECT AVG(total_score) as avg_score, COUNT(*) as count
        FROM mock_tests 
        WHERE user_exam_id = ?
      `, [ue.id]);

      const subjects = await query(`
        SELECT * FROM exam_subjects 
        WHERE exam_id = ? 
        ORDER BY sort_order
      `, [ue.exam_id]);

      result.push({
        ...ue,
        is_primary: !!ue.is_primary,
        totalTopics: totalTopicsRow.count || 0,
        doneTopics: doneTopicsRow.count || 0,
        avgMockScore: mockAvgRow.avg_score !== null ? parseFloat(mockAvgRow.avg_score.toFixed(1)) : null,
        mockCount: mockAvgRow.count || 0,
        subjects
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enroll in a new exam (seeds progress rows)
app.post('/api/users/me/exams', async (req, res) => {
  try {
    const { examId, targetDate, dailyGoalHrs } = req.body;

    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }

    // Check if already enrolled
    const existing = await get('SELECT * FROM user_exams WHERE user_id = ? AND exam_id = ?', [req.userId, examId]);
    if (existing) {
      await run(`
        UPDATE user_exams 
        SET target_date = ?, daily_goal_hrs = ?
        WHERE id = ?
      `, [targetDate || existing.target_date, dailyGoalHrs || existing.daily_goal_hrs, existing.id]);
      
      return res.status(200).json({ message: 'Updated existing enrollment parameters', userExamId: existing.id });
    }

    // Check if other enrolled exams exist to determine primary flag
    const primaryCheck = await get('SELECT COUNT(*) as count FROM user_exams WHERE user_id = ?', [req.userId]);
    const isPrimary = primaryCheck.count === 0 ? 1 : 0;

    const userExamId = uuidv4();
    const enrolledAt = new Date().toISOString();

    // Insert user exam enrollment
    await run(`
      INSERT INTO user_exams (id, user_id, exam_id, target_date, is_primary, enrolled_at, daily_goal_hrs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userExamId, req.userId, examId, targetDate || '', isPrimary, enrolledAt, dailyGoalHrs || 2.0]);

    // SEED PROGRESS ROWS: Copy all topics mapped to this exam into user_topic_progress
    const examTopics = await query(`
      SELECT topic_id FROM exam_topic_map WHERE exam_id = ?
    `, [examId]);

    for (const et of examTopics) {
      await run(`
        INSERT OR IGNORE INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor)
        VALUES (?, ?, ?, ?, 'Not Started', 0, 2.5)
      `, [uuidv4(), req.userId, userExamId, et.topic_id]);
    }

    res.status(201).json({ message: 'Enrolled successfully', userExamId });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed stats of a specific user_exam
app.get('/api/users/me/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ue = await get(`
      SELECT ue.*, e.name as exam_name, e.slug as exam_slug, e.tiers, e.marking_scheme, e.safe_cutoff
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      WHERE ue.id = ? AND ue.user_id = ?
    `, [id, req.userId]);

    if (!ue) {
      return res.status(404).json({ error: 'User enrollment not found' });
    }

    const subjects = await query(`
      SELECT * FROM exam_subjects 
      WHERE exam_id = ? 
      ORDER BY sort_order
    `, [ue.exam_id]);

    res.json({
      ...ue,
      is_primary: !!ue.is_primary,
      tiers: ue.tiers ? JSON.parse(ue.tiers) : [],
      marking_scheme: ue.marking_scheme ? JSON.parse(ue.marking_scheme) : {},
      subjects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update target date, daily goal, is_primary
app.patch('/api/users/me/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDate, dailyGoalHrs, isPrimary } = req.body;

    const ue = await get('SELECT * FROM user_exams WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!ue) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (isPrimary === true || isPrimary === 1) {
      // Clear current primary
      await run('UPDATE user_exams SET is_primary = 0 WHERE user_id = ?', [req.userId]);
      await run('UPDATE user_exams SET is_primary = 1 WHERE id = ? AND user_id = ?', [id, req.userId]);
    }

    if (targetDate !== undefined) {
      await run('UPDATE user_exams SET target_date = ? WHERE id = ?', [targetDate, id]);
    }

    if (dailyGoalHrs !== undefined) {
      await run('UPDATE user_exams SET daily_goal_hrs = ? WHERE id = ?', [dailyGoalHrs, id]);
    }

    res.json({ message: 'Update successful' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set an exam as primary (dashboard default)
app.patch('/api/users/me/exams/:id/primary', async (req, res) => {
  try {
    const { id } = req.params;
    await run('UPDATE user_exams SET is_primary = 0 WHERE user_id = ?', [req.userId]);
    const result = await run('UPDATE user_exams SET is_primary = 1 WHERE id = ? AND user_id = ?', [id, req.userId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Primary exam updated successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove exam + archive progress
app.delete('/api/users/me/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await run('DELETE FROM user_exams WHERE id = ? AND user_id = ?', [id, req.userId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Set another exam as primary if primary was deleted
    const countRow = await get('SELECT COUNT(*) as count FROM user_exams WHERE user_id = ? AND is_primary = 1', [req.userId]);
    if (countRow.count === 0) {
      const nextOne = await get('SELECT id FROM user_exams WHERE user_id = ? LIMIT 1', [req.userId]);
      if (nextOne) {
        await run('UPDATE user_exams SET is_primary = 1 WHERE id = ?', [nextOne.id]);
      }
    }

    res.json({ message: 'Exam enrollment deleted successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync and restore database from local storage backup (resolves ephemeral sqlite database resets)
app.post('/api/users/me/sync-restore', async (req, res) => {
  try {
    const { enrolledExams } = req.body;
    if (!enrolledExams || typeof enrolledExams !== 'object') {
      return res.status(400).json({ error: 'enrolledExams object is required' });
    }

    const email = req.userId;

    for (const [examId, backupData] of Object.entries(enrolledExams)) {
      // 1. Check if user is already enrolled in this exam
      let ue = await get('SELECT id FROM user_exams WHERE user_id = ? AND exam_id = ?', [email, examId]);
      let userExamId;

      if (!ue) {
        // Create enrollment
        userExamId = uuidv4();
        const enrolledAt = new Date().toISOString();
        const primaryCheck = await get('SELECT COUNT(*) as count FROM user_exams WHERE user_id = ?', [email]);
        const isPrimary = primaryCheck.count === 0 ? 1 : 0;

        await run(`
          INSERT INTO user_exams (id, user_id, exam_id, target_date, is_primary, enrolled_at, daily_goal_hrs)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userExamId, email, examId, '', isPrimary, enrolledAt, backupData.dailyGoalHrs || 2.0]);

        // Seed default topics into user_topic_progress
        const examTopics = await query('SELECT topic_id FROM exam_topic_map WHERE exam_id = ?', [examId]);
        for (const et of examTopics) {
          await run(`
            INSERT OR IGNORE INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor)
            VALUES (?, ?, ?, ?, 'Not Started', 0, 2.5)
          `, [uuidv4(), email, userExamId, et.topic_id]);
        }
      } else {
        userExamId = ue.id;
        // Update daily goal
        await run('UPDATE user_exams SET daily_goal_hrs = ? WHERE id = ?', [backupData.dailyGoalHrs || 2.0, userExamId]);
      }

      // 2. Restore Custom Topics
      if (Array.isArray(backupData.customTopics)) {
        for (const ct of backupData.customTopics) {
          const subject = await get('SELECT shared_pool_key, name FROM exam_subjects WHERE id = ?', [ct.subjectId]);
          if (!subject) continue;

          const poolKey = subject.shared_pool_key || 'custom_pool';
          
          let topicRow = await get('SELECT id FROM topics WHERE pool_key = ? AND section = ? AND topic = ?', [poolKey, ct.section || 'Custom Topics', ct.topic]);
          let topicId = topicRow ? topicRow.id : uuidv4();

          if (!topicRow) {
            await run(`
              INSERT INTO topics (id, pool_key, subject_name, section, topic, is_template, difficulty, avg_weightage)
              VALUES (?, ?, ?, ?, ?, 0, ?, 0)
            `, [topicId, poolKey, subject.name, ct.section || 'Custom Topics', ct.topic, ct.difficulty || 'medium']);
          }

          let mapRow = await get('SELECT id FROM exam_topic_map WHERE exam_id = ? AND subject_id = ? AND topic_id = ?', [examId, ct.subjectId, topicId]);
          if (!mapRow) {
            const countMap = await get('SELECT COUNT(*) as count FROM exam_topic_map WHERE exam_id = ? AND subject_id = ?', [examId, ct.subjectId]);
            const nextSort = (countMap.count || 0) + 1;
            await run(`
              INSERT INTO exam_topic_map (id, exam_id, subject_id, topic_id, priority, recommended_resource, resource_chapter, sort_order, is_optional)
              VALUES (?, ?, ?, ?, ?, ?, '', ?, 0)
            `, [uuidv4(), examId, ct.subjectId, topicId, ct.priority || 'Medium', ct.recommendedResource || '', nextSort]);
          }

          let progressRow = await get('SELECT id FROM user_topic_progress WHERE user_exam_id = ? AND topic_id = ?', [userExamId, topicId]);
          if (!progressRow) {
            await run(`
              INSERT INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor, notes, done_at, next_review_at, difficulty_rating)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [uuidv4(), email, userExamId, topicId, ct.status || 'Not Started', ct.done ? 1 : 0, 2.5, ct.notes || '', ct.done_at || null, ct.next_review_at || null, ct.difficulty_rating || null]);
          } else {
            await run(`
              UPDATE user_topic_progress SET
                status = ?, done = ?, notes = ?, done_at = ?, next_review_at = ?, difficulty_rating = ?
              WHERE id = ?
            `, [ct.status || 'Not Started', ct.done ? 1 : 0, ct.notes || '', ct.done_at || null, ct.next_review_at || null, ct.difficulty_rating || null, progressRow.id]);
          }
        }
      }

      // 3. Restore standard progress updates
      if (backupData.progress && typeof backupData.progress === 'object') {
        for (const [topicName, p] of Object.entries(backupData.progress)) {
          let topicRow = await get('SELECT id FROM topics WHERE topic = ?', [topicName]);

          if (topicRow) {
            const topicId = topicRow.id;
            let progressRow = await get('SELECT id FROM user_topic_progress WHERE user_exam_id = ? AND topic_id = ?', [userExamId, topicId]);
            
            if (progressRow) {
              await run(`
                UPDATE user_topic_progress SET
                  status = ?,
                  done = ?,
                  notes = ?,
                  done_at = ?,
                  ease_factor = ?,
                  next_review_at = ?,
                  difficulty_rating = ?
                WHERE id = ?
              `, [
                p.status || 'Not Started',
                p.done ? 1 : 0,
                p.notes || '',
                p.done_at || null,
                p.ease_factor || 2.5,
                p.next_review_at || null,
                p.difficulty_rating || null,
                progressRow.id
              ]);
            } else {
              await run(`
                INSERT INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor, notes, done_at, next_review_at, difficulty_rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                uuidv4(),
                email,
                userExamId,
                topicId,
                p.status || 'Not Started',
                p.done ? 1 : 0,
                p.ease_factor || 2.5,
                p.notes || '',
                p.done_at || null,
                p.next_review_at || null,
                p.difficulty_rating || null
              ]);
            }
          }
        }
      }

      // 4. Restore Mock Tests
      if (Array.isArray(backupData.mocks)) {
        for (const m of backupData.mocks) {
          let existingMock = await get('SELECT id FROM mock_tests WHERE user_exam_id = ? AND name = ? AND test_date = ?', [userExamId, m.name, m.testDate]);
          if (!existingMock) {
            let totalScore = 0;
            if (m.sectionScores) {
              Object.values(m.sectionScores).forEach(val => {
                totalScore += parseFloat(val || 0);
              });
            }
            await run(`
              INSERT INTO mock_tests (id, user_exam_id, name, test_date, section_scores, total_score, max_score, tier, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(),
              userExamId,
              m.name,
              m.testDate,
              JSON.stringify(m.sectionScores || {}),
              totalScore,
              m.maxScore || 100,
              m.tier || 'Prelims',
              m.notes || ''
            ]);
          }
        }
      }
    }

    res.json({ success: true, message: 'Sync restore completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TOPIC & PROGRESS API
// ----------------------------------------------------

// Get all topics for a user_exam, grouped by subjects, with user progress merged
app.get('/api/user-exams/:id/topics', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exam
    const ue = await get('SELECT exam_id FROM user_exams WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!ue) {
      return res.status(404).json({ error: 'User exam enrollment not found' });
    }

    const subjects = await query(`
      SELECT * FROM exam_subjects 
      WHERE exam_id = ? 
      ORDER BY sort_order
    `, [ue.exam_id]);

    const result = [];

    for (const subject of subjects) {
      const topics = await query(`
        SELECT 
          t.id as topic_id,
          t.subject_name,
          t.section,
          t.topic as name,
          t.difficulty as canonical_difficulty,
          t.avg_weightage,
          t.is_template,
          m.priority,
          m.recommended_resource,
          m.resource_chapter,
          m.is_optional,
          p.id as progress_id,
          p.status,
          p.done,
          p.notes,
          p.done_at,
          p.ease_factor,
          p.next_review_at,
          p.difficulty_rating
        FROM exam_topic_map m
        JOIN topics t ON m.topic_id = t.id
        LEFT JOIN user_topic_progress p ON p.topic_id = t.id AND p.user_exam_id = ?
        WHERE m.exam_id = ? AND m.subject_id = ?
        ORDER BY m.sort_order
      `, [id, ue.exam_id, subject.id]);

      // Normalize boolean done flag
      const normalizedTopics = topics.map(t => ({
        ...t,
        done: !!t.done,
        is_optional: !!t.is_optional
      }));

      result.push({
        ...subject,
        topics: normalizedTopics
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status, done, notes, difficulty_rating for a topic progress (using SM-2 algorithm)
app.patch('/api/user-exams/:id/topics/:tid', async (req, res) => {
  try {
    const { id: userExamId, tid: topicId } = req.params;
    const { status, done, notes, difficultyRating } = req.body;

    // Check if progress row exists
    let progress = await get(`
      SELECT * FROM user_topic_progress 
      WHERE user_exam_id = ? AND topic_id = ?
    `, [userExamId, topicId]);

    const now = new Date().toISOString();

    if (!progress) {
      // Create if missing
      const newId = uuidv4();
      await run(`
        INSERT INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor)
        VALUES (?, ?, ?, ?, 'Not Started', 0, 2.5)
      `, [newId, req.userId, userExamId, topicId]);
      progress = await get('SELECT * FROM user_topic_progress WHERE id = ?', [newId]);
    }

    let nextStatus = status !== undefined ? status : progress.status;
    let nextDone = done !== undefined ? (done ? 1 : 0) : progress.done;
    let doneAt = progress.done_at;
    let nextEase = progress.ease_factor || 2.5;
    let nextReview = progress.next_review_at;
    let nextDiffRating = difficultyRating !== undefined ? difficultyRating : progress.difficulty_rating;

    // If done state changes to true
    if (nextDone === 1 && progress.done === 0) {
      doneAt = now;
      if (nextStatus === 'Not Started' || nextStatus === 'In Progress') {
        nextStatus = 'Done';
      }
    } else if (nextDone === 0 && progress.done === 1) {
      doneAt = null;
      if (nextStatus === 'Done') {
        nextStatus = 'In Progress';
      }
    }

    // Apply Spaced Repetition (SM-2) if difficulty rating (quality 1-5) is provided
    if (difficultyRating !== undefined && difficultyRating > 0) {
      // For SM-2: rating maps to quality Q (1 to 5)
      const q = difficultyRating; 
      
      // Calculate next ease factor
      // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      nextEase = nextEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      if (nextEase < 1.3) nextEase = 1.3;

      // Determine repetition interval (in days)
      let interval = 1;
      
      // Look up count of previous consecutive reviews (or simplify based on rating)
      // High score (4 or 5) means longer interval, low score (1 or 2) resets interval
      if (q < 3) {
        interval = 1; // reset/repeat tomorrow
      } else {
        // Simple consecutive calculator
        const prevInterval = progress.next_review_at 
          ? Math.max(1, Math.ceil((new Date(progress.next_review_at) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0;

        if (prevInterval <= 1) {
          interval = 6;
        } else {
          interval = Math.round(prevInterval * nextEase);
        }
      }

      // Calculate next review date
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() + interval);
      nextReview = reviewDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Update progress row
    await run(`
      UPDATE user_topic_progress SET
        status = ?,
        done = ?,
        notes = ?,
        done_at = ?,
        ease_factor = ?,
        next_review_at = ?,
        difficulty_rating = ?
      WHERE id = ?
    `, [
      nextStatus,
      nextDone,
      notes !== undefined ? notes : progress.notes,
      doneAt,
      nextEase,
      nextReview,
      nextDiffRating,
      progress.id
    ]);

    // ----------------------------------------------------
    // DYNAMIC SYNC ENGINE:
    // If the topic is shared, also update progress in other exams!
    // ----------------------------------------------------
    const topicDetails = await get('SELECT pool_key FROM topics WHERE id = ?', [topicId]);
    if (topicDetails) {
      const sharedPoolKey = topicDetails.pool_key;
      
      // Find all topic IDs that share this pool_key
      const siblingTopics = await query('SELECT id FROM topics WHERE pool_key = ?', [sharedPoolKey]);
      const siblingIds = siblingTopics.map(t => t.id);

      if (siblingIds.length > 0) {
        // Query other user exams (excluding active one)
        const siblingProgressRows = await query(`
          SELECT id, user_exam_id, done 
          FROM user_topic_progress 
          WHERE user_id = ? 
            AND topic_id IN (${siblingIds.map(() => '?').join(',')})
            AND user_exam_id != ?
        `, [req.userId, ...siblingIds, userExamId]);

        for (const row of siblingProgressRows) {
          // Sync done state and status
          await run(`
            UPDATE user_topic_progress SET
              done = ?,
              status = CASE WHEN ? = 1 THEN 'Done' ELSE 'In Progress' END,
              done_at = ?
            WHERE id = ?
          `, [nextDone, nextDone, nextDone === 1 ? now : null, row.id]);
        }
      }
    }

    res.json({
      message: 'Progress updated successfully',
      syncExecuted: true,
      data: {
        status: nextStatus,
        done: !!nextDone,
        easeFactor: nextEase,
        nextReviewAt: nextReview,
        difficultyRating: nextDiffRating
      }
    });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate flashcards for a specific topic (formulas + key points)
app.get('/api/user-exams/:id/topics/:tid/flashcards', async (req, res) => {
  try {
    const { id: userExamId, tid: topicId } = req.params;

    // Get user exam info
    const ue = await get(`
      SELECT ue.exam_id, e.name as exam_name, e.slug as exam_slug
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      WHERE ue.id = ? AND ue.user_id = ?
    `, [userExamId, req.userId]);

    if (!ue) return res.status(404).json({ error: 'User exam not found' });

    // Get topic details
    const topic = await get('SELECT * FROM topics WHERE id = ?', [topicId]);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const cards = await generateFlashcards({
      topic: topic.topic,
      section: topic.section,
      examSlug: ue.exam_slug,
      examName: ue.exam_name
    });

    res.json({ topic: topic.topic, section: topic.section, cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk status update across multiple topics
app.post('/api/user-exams/:id/topics/bulk', async (req, res) => {
  try {
    const { id: userExamId } = req.params;
    const { topicIds, status, done } = req.body;

    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      return res.status(400).json({ error: 'topicIds array is required' });
    }

    const nextDone = done ? 1 : 0;
    const now = new Date().toISOString();

    for (const tid of topicIds) {
      // Check if progress row exists
      const progress = await get('SELECT id FROM user_topic_progress WHERE user_exam_id = ? AND topic_id = ?', [userExamId, tid]);

      if (progress) {
        await run(`
          UPDATE user_topic_progress SET
            status = ?,
            done = ?,
            done_at = ?
          WHERE id = ?
        `, [status, nextDone, nextDone === 1 ? now : null, progress.id]);
      } else {
        await run(`
          INSERT INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, done_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), req.userId, userExamId, tid, status, nextDone, nextDone === 1 ? now : null]);
      }

      // Sync siblings if shared topic
      const topicDetails = await get('SELECT pool_key FROM topics WHERE id = ?', [tid]);
      if (topicDetails) {
        const siblingTopics = await query('SELECT id FROM topics WHERE pool_key = ?', [topicDetails.pool_key]);
        const siblingIds = siblingTopics.map(t => t.id);

        if (siblingIds.length > 0) {
          await run(`
            UPDATE user_topic_progress SET
              done = ?,
              status = ?,
              done_at = ?
            WHERE user_id = ? AND topic_id IN (${siblingIds.map(() => '?').join(',')}) AND user_exam_id != ?
          `, [nextDone, status, nextDone === 1 ? now : null, req.userId, ...siblingIds, userExamId]);
        }
      }
    }

    res.json({ message: `Bulk updated ${topicIds.length} topics successfully.` });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add user-created custom topic to this exam
app.post('/api/user-exams/:id/topics/custom', async (req, res) => {
  try {
    const { id: userExamId } = req.params;
    const { subjectId, section, topic, priority, recommendedResource, difficulty } = req.body;

    if (!subjectId || !topic) {
      return res.status(400).json({ error: 'subjectId and topic are required' });
    }

    const ue = await get('SELECT exam_id FROM user_exams WHERE id = ?', [userExamId]);
    if (!ue) {
      return res.status(404).json({ error: 'User exam not found' });
    }

    const subject = await get('SELECT shared_pool_key, name FROM exam_subjects WHERE id = ?', [subjectId]);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const topicId = uuidv4();
    const poolKey = subject.shared_pool_key || 'custom_pool';

    // 1. Insert into topics pool
    await run(`
      INSERT INTO topics (id, pool_key, subject_name, section, topic, is_template, difficulty, avg_weightage)
      VALUES (?, ?, ?, ?, ?, 0, ?, 0)
    `, [topicId, poolKey, subject.name, section || 'Custom Topics', topic, difficulty || 'medium']);

    // 2. Map to the exam
    const countMap = await get('SELECT COUNT(*) as count FROM exam_topic_map WHERE exam_id = ? AND subject_id = ?', [ue.exam_id, subjectId]);
    const nextSort = (countMap.count || 0) + 1;

    await run(`
      INSERT INTO exam_topic_map (id, exam_id, subject_id, topic_id, priority, recommended_resource, resource_chapter, sort_order, is_optional)
      VALUES (?, ?, ?, ?, ?, ?, '', ?, 0)
    `, [uuidv4(), ue.exam_id, subjectId, topicId, priority || 'Medium', recommendedResource || '', nextSort]);

    // 3. Create progress row
    const progressId = uuidv4();
    await run(`
      INSERT INTO user_topic_progress (id, user_id, user_exam_id, topic_id, status, done, ease_factor)
      VALUES (?, ?, ?, ?, 'Not Started', 0, 2.5)
    `, [progressId, req.userId, userExamId, topicId]);

    res.status(201).json({ message: 'Custom topic added successfully', topicId });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Next-Up pending high priority topics
app.get('/api/user-exams/:id/next-up', async (req, res) => {
  try {
    const { id } = req.params;
    const nextUp = await query(`
      SELECT t.topic, t.section, t.subject_name, m.priority, p.status, m.recommended_resource
      FROM exam_topic_map m
      JOIN topics t ON m.topic_id = t.id
      JOIN user_topic_progress p ON p.topic_id = t.id AND p.user_exam_id = ?
      WHERE p.done = 0 AND m.priority = 'High'
      LIMIT 5
    `, [id]);

    res.json(nextUp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get due topics for spaced repetition revision
app.get('/api/user-exams/:id/revision-due', async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const due = await query(`
      SELECT t.topic, t.section, t.subject_name, p.next_review_at, p.difficulty_rating, p.notes
      FROM user_topic_progress p
      JOIN topics t ON p.topic_id = t.id
      WHERE p.user_exam_id = ? 
        AND p.done = 1 
        AND (p.status = 'Revision' OR p.next_review_at <= ?)
      ORDER BY p.next_review_at ASC
    `, [id, today]);

    res.json(due);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ANALYTICS & DIAGNOSTICS ENDPOINTS
// ----------------------------------------------------

// Get progress stats grouped by subjects
app.get('/api/user-exams/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    const ue = await get('SELECT exam_id FROM user_exams WHERE id = ?', [id]);
    if (!ue) {
      return res.status(404).json({ error: 'User exam not found' });
    }

    const subjects = await query('SELECT id, name, color FROM exam_subjects WHERE exam_id = ? ORDER BY sort_order', [ue.exam_id]);
    const result = [];

    for (const sub of subjects) {
      const counts = await get(`
        SELECT COUNT(*) as total, SUM(CASE WHEN p.done = 1 THEN 1 ELSE 0 END) as done
        FROM exam_topic_map m
        JOIN topics t ON m.topic_id = t.id
        LEFT JOIN user_topic_progress p ON p.topic_id = t.id AND p.user_exam_id = ?
        WHERE m.subject_id = ?
      `, [id, sub.id]);

      result.push({
        subjectId: sub.id,
        subjectName: sub.name,
        color: sub.color,
        totalTopics: counts.total || 0,
        doneTopics: counts.done || 0,
        percentage: counts.total ? Math.round((counts.done / counts.total) * 100) : 0
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scores of logged mock tests (progression trend)
app.get('/api/user-exams/:id/mocks/trend', async (req, res) => {
  try {
    const { id } = req.params;
    const mocks = await query(`
      SELECT id, name, test_date, total_score, max_score, tier, notes
      FROM mock_tests
      WHERE user_exam_id = ?
      ORDER BY test_date ASC
    `, [id]);

    res.json(mocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed diagnostic insights (cutoff gap, subject weakness analysis)
app.get('/api/user-exams/:id/mocks/diagnostics', async (req, res) => {
  try {
    const { id } = req.params;

    const ue = await get(`
      SELECT ue.*, e.safe_cutoff, e.name as exam_name
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      WHERE ue.id = ?
    `, [id]);

    if (!ue) return res.status(404).json({ error: 'User exam not found' });

    const mocks = await query('SELECT section_scores, total_score FROM mock_tests WHERE user_exam_id = ?', [id]);

    let overallAverage = 0;
    const subjectAverages = {};
    const subjectCounts = {};

    if (mocks.length > 0) {
      let sum = 0;
      mocks.forEach(m => {
        sum += m.total_score;
        try {
          const scores = JSON.parse(m.section_scores);
          Object.keys(scores).forEach(subName => {
            subjectAverages[subName] = (subjectAverages[subName] || 0) + scores[subName];
            subjectCounts[subName] = (subjectCounts[subName] || 0) + 1;
          });
        } catch (e) {
          // ignore parsing error
        }
      });
      overallAverage = parseFloat((sum / mocks.length).toFixed(1));
      
      // Calculate section averages
      Object.keys(subjectAverages).forEach(subName => {
        subjectAverages[subName] = parseFloat((subjectAverages[subName] / subjectCounts[subName]).toFixed(1));
      });
    }

    const cutoffGap = ue.safe_cutoff ? parseFloat((overallAverage - ue.safe_cutoff).toFixed(1)) : 0;

    // Identify weak subjects (subjects with scores lower than 60% of their maximum marks)
    const examSubjects = await query('SELECT name, max_marks FROM exam_subjects WHERE exam_id = ?', [ue.exam_id]);
    const weaknesses = [];

    for (const sub of examSubjects) {
      const avg = subjectAverages[sub.name];
      if (avg !== undefined && sub.max_marks) {
        const percent = (avg / sub.max_marks) * 100;
        if (percent < 60) {
          // Query top high-priority incomplete topics in this weak subject
          const pendingTopics = await query(`
            SELECT t.topic, m.priority, m.recommended_resource
            FROM exam_topic_map m
            JOIN topics t ON m.topic_id = t.id
            JOIN exam_subjects s ON m.subject_id = s.id
            LEFT JOIN user_topic_progress p ON p.topic_id = t.id AND p.user_exam_id = ?
            WHERE m.exam_id = ? AND s.name = ? AND (p.done = 0 OR p.done IS NULL)
            ORDER BY CASE WHEN m.priority = 'High' THEN 1 WHEN m.priority = 'Medium' THEN 2 ELSE 3 END
            LIMIT 3
          `, [id, ue.exam_id, sub.name]);

          weaknesses.push({
            subjectName: sub.name,
            averageScore: avg,
            maxMarks: sub.max_marks,
            percentage: Math.round(percent),
            pendingHighPriorityTopics: pendingTopics
          });
        }
      }
    }

    res.json({
      overallAverage,
      safeCutoff: ue.safe_cutoff,
      cutoffGap,
      subjectAverages,
      weaknesses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cross-exam summary dashboard
app.get('/api/analytics/all-exams', async (req, res) => {
  try {
    const enrolled = await query(`
      SELECT ue.*, e.name as exam_name, e.slug as exam_slug, e.safe_cutoff
      FROM user_exams ue
      JOIN exams e ON ue.exam_id = e.id
      WHERE ue.user_id = ?
    `, [req.userId]);

    const result = [];
    for (const ue of enrolled) {
      const totalRow = await get('SELECT COUNT(*) as count FROM exam_topic_map WHERE exam_id = ?', [ue.exam_id]);
      const doneRow = await get('SELECT COUNT(*) as count FROM user_topic_progress WHERE user_exam_id = ? AND done = 1', [ue.id]);
      
      result.push({
        userExamId: ue.id,
        examName: ue.exam_name,
        examSlug: ue.exam_slug,
        targetDate: ue.target_date,
        isPrimary: !!ue.is_primary,
        totalTopics: totalRow.count || 0,
        doneTopics: doneRow.count || 0,
        progressPercent: totalRow.count ? Math.round((doneRow.count / totalRow.count) * 100) : 0
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// MOCK TESTS LOGGING ENDPOINTS
// ----------------------------------------------------

app.get('/api/user-exams/:id/mocks', async (req, res) => {
  try {
    const { id } = req.params;
    const mocks = await query('SELECT * FROM mock_tests WHERE user_exam_id = ? ORDER BY test_date DESC', [id]);
    const parsed = mocks.map(m => ({
      ...m,
      section_scores: JSON.parse(m.section_scores)
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-exams/:id/mocks', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, testDate, sectionScores, maxScore, tier, notes } = req.body;

    if (!name || !testDate || !sectionScores) {
      return res.status(400).json({ error: 'name, testDate, and sectionScores are required' });
    }

    // Calculate total score dynamically from section scores
    let totalScore = 0;
    Object.keys(sectionScores).forEach(key => {
      totalScore += parseFloat(sectionScores[key] || 0);
    });

    const mockId = uuidv4();
    await run(`
      INSERT INTO mock_tests (id, user_exam_id, name, test_date, section_scores, total_score, max_score, tier, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mockId,
      id,
      name,
      testDate,
      JSON.stringify(sectionScores),
      totalScore,
      maxScore || 100,
      tier || 'Prelims',
      notes || ''
    ]);

    res.status(201).json({ message: 'Mock test logged successfully', mockId, totalScore });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user-exams/:id/mocks/:mid', async (req, res) => {
  try {
    const { mid } = req.params;
    const result = await run('DELETE FROM mock_tests WHERE id = ?', [mid]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mock test not found' });
    }
    res.json({ message: 'Mock test deleted successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DAILY TASKS AGENDA ENDPOINTS
// ----------------------------------------------------

app.get('/api/user-exams/:id/daily-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const tasks = await query(`
      SELECT * FROM daily_tasks 
      WHERE user_exam_id = ? AND substr(created_at, 1, 10) = ?
      ORDER BY created_at ASC
    `, [id, today]);
    
    const parsed = tasks.map(t => ({
      ...t,
      done: !!t.done
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-exams/:id/daily-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { taskText, subjectName } = req.body;
    if (!taskText) {
      return res.status(400).json({ error: 'taskText is required' });
    }
    const taskId = uuidv4();
    const createdAt = new Date().toISOString();
    await run(`
      INSERT INTO daily_tasks (id, user_exam_id, task_text, subject_name, done, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [taskId, id, taskText, subjectName || null, createdAt]);

    res.status(201).json({ message: 'Task added successfully', taskId });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/user-exams/:id/daily-tasks/:tid', async (req, res) => {
  try {
    const { tid } = req.params;
    const { done } = req.body;
    const nextDone = done ? 1 : 0;
    await run('UPDATE daily_tasks SET done = ? WHERE id = ?', [nextDone, tid]);
    res.json({ message: 'Task updated successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user-exams/:id/daily-tasks/:tid', async (req, res) => {
  try {
    const { tid } = req.params;
    await run('DELETE FROM daily_tasks WHERE id = ?', [tid]);
    res.json({ message: 'Task deleted successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SUBJECT GOALS & HOURS TRACKER ENDPOINTS
// ----------------------------------------------------

app.get('/api/user-exams/:id/subject-goals', async (req, res) => {
  try {
    const { id } = req.params;
    const goals = await query(`
      SELECT * FROM subject_goals 
      WHERE user_exam_id = ?
    `, [id]);
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-exams/:id/subject-goals', async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId, weeklyTargetHours, hoursCompleted } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: 'subjectId is required' });
    }

    const target = weeklyTargetHours !== undefined ? parseFloat(weeklyTargetHours) : 2.0;
    const completed = hoursCompleted !== undefined ? parseFloat(hoursCompleted) : 0.0;

    const existing = await get('SELECT id FROM subject_goals WHERE user_exam_id = ? AND subject_id = ?', [id, subjectId]);
    if (existing) {
      await run(`
        UPDATE subject_goals 
        SET weekly_target_hours = ?, hours_completed = ?
        WHERE id = ?
      `, [target, completed, existing.id]);
    } else {
      const goalId = uuidv4();
      const createdAt = new Date().toISOString();
      await run(`
        INSERT INTO subject_goals (id, user_exam_id, subject_id, weekly_target_hours, hours_completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [goalId, id, subjectId, target, completed, createdAt]);
    }

    res.json({ message: 'Subject goal updated successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-exams/:id/subject-goals/:sid/log-time', async (req, res) => {
  try {
    const { id, sid } = req.params;
    const { hours } = req.body;
    const logHours = parseFloat(hours) || 0.0;

    const existing = await get('SELECT id, hours_completed FROM subject_goals WHERE user_exam_id = ? AND subject_id = ?', [id, sid]);
    if (existing) {
      const nextCompleted = Math.max(0.0, (existing.hours_completed || 0.0) + logHours);
      await run('UPDATE subject_goals SET hours_completed = ? WHERE id = ?', [nextCompleted, existing.id]);
    } else {
      const goalId = uuidv4();
      const createdAt = new Date().toISOString();
      await run(`
        INSERT INTO subject_goals (id, user_exam_id, subject_id, weekly_target_hours, hours_completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [goalId, id, sid, 2.0, Math.max(0.0, logHours), createdAt]);
    }

    res.json({ message: 'Study hours logged successfully' });
    saveUserCloudBackup(req.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// GAMIFICATION & STREAKS ENDPOINT
// ----------------------------------------------------

app.get('/api/user-exams/:id/gamification', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all dates where progress was marked 'done = 1'
    const progressDates = await query(`
      SELECT DISTINCT substr(done_at, 1, 10) as date_str
      FROM user_topic_progress
      WHERE user_exam_id = ? AND done = 1 AND done_at IS NOT NULL
    `, [id]);

    // Get all dates where mock tests were taken
    const mockDates = await query(`
      SELECT DISTINCT substr(test_date, 1, 10) as date_str
      FROM mock_tests
      WHERE user_exam_id = ? AND test_date IS NOT NULL
    `, [id]);

    // Combine and get unique sorted dates (descending order)
    const allDatesSet = new Set();
    progressDates.forEach(d => allDatesSet.add(d.date_str));
    mockDates.forEach(d => allDatesSet.add(d.date_str));

    // Sort dates descending
    const sortedDates = Array.from(allDatesSet).sort().reverse();

    // Get local timezone offset to calculate today/yesterday in local time
    const todayLocal = new Date();
    const formatLocal = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    };

    const todayStr = formatLocal(todayLocal);
    const yesterday = new Date(todayLocal);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocal(yesterday);

    let streak = 0;
    if (sortedDates.length > 0) {
      let latestDate = sortedDates[0];
      
      if (latestDate === todayStr || latestDate === yesterdayStr) {
        streak = 1;
        let currentExpected = new Date(latestDate);
        
        for (let i = 1; i < sortedDates.length; i++) {
          currentExpected.setDate(currentExpected.getDate() - 1);
          const expectedStr = formatLocal(currentExpected);
          
          if (sortedDates.includes(expectedStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate achievements/badges
    const totalDone = await get('SELECT COUNT(*) as count FROM user_topic_progress WHERE user_exam_id = ? AND done = 1', [id]);
    const badgeFirstSteps = (totalDone.count || 0) >= 1;
    const badgeDeepFocus = (totalDone.count || 0) >= 5;
    const badgeStreakMaster = streak >= 3;

    const totalMocks = await get('SELECT COUNT(*) as count FROM mock_tests WHERE user_exam_id = ?', [id]);
    const badgeMockPioneer = (totalMocks.count || 0) >= 1;

    let badgeSubjectExpert = false;
    const subjects = await query('SELECT id, name FROM exam_subjects WHERE exam_id = (SELECT exam_id FROM user_exams WHERE id = ?)', [id]);
    for (const sub of subjects) {
      const totalSubRow = await get('SELECT COUNT(*) as count FROM exam_topic_map WHERE subject_id = ?', [sub.id]);
      const doneSubRow = await get('SELECT COUNT(*) as count FROM user_topic_progress WHERE user_exam_id = ? AND done = 1 AND topic_id IN (SELECT topic_id FROM exam_topic_map WHERE subject_id = ?)', [id, sub.id]);
      if (totalSubRow.count > 0 && doneSubRow.count === totalSubRow.count) {
        badgeSubjectExpert = true;
        break;
      }
    }

    const maxMock = await get('SELECT MAX(total_score * 1.0 / max_score) as max_ratio FROM mock_tests WHERE user_exam_id = ?', [id]);
    const badgeHighFlyer = maxMock.max_ratio !== null && maxMock.max_ratio >= 0.8;

    const badges = [
      { id: 'first_steps', name: 'First Steps', desc: 'Completed your first syllabus topic', unlocked: badgeFirstSteps, icon: 'ti-footprint' },
      { id: 'deep_focus', name: 'Deep Focus', desc: 'Completed 5 syllabus topics', unlocked: badgeDeepFocus, icon: 'ti-brain' },
      { id: 'streak_master', name: 'Streak Master', desc: 'Maintained a 3-day study streak', unlocked: badgeStreakMaster, icon: 'ti-flame' },
      { id: 'mock_pioneer', name: 'Mock Pioneer', desc: 'Logged your first mock test score', unlocked: badgeMockPioneer, icon: 'ti-award' },
      { id: 'subject_expert', name: 'Subject Expert', desc: 'Completed 100% of any subject syllabus', unlocked: badgeSubjectExpert, icon: 'ti-certificate' },
      { id: 'high_flyer', name: 'High Flyer', desc: 'Scored 80% or higher in a mock test', unlocked: badgeHighFlyer, icon: 'ti-rocket' }
    ];

    res.json({ streak, badges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AI SPACE ENDPOINTS (Gemini + Fallback)
// ----------------------------------------------------

app.post('/api/ai/explain', async (req, res) => {
  try {
    const { topic, examSlug, examName } = req.body;
    if (!topic || !examSlug || !examName) {
      return res.status(400).json({ error: 'topic, examSlug, and examName are required' });
    }
    const explanation = await explainTopic({ topic, examSlug, examName });
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/questions', async (req, res) => {
  try {
    const { topic, examSlug, examName } = req.body;
    if (!topic || !examSlug || !examName) {
      return res.status(400).json({ error: 'topic, examSlug, and examName are required' });
    }
    const questions = await generateMCQs({ topic, examSlug, examName });
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/plan', async (req, res) => {
  try {
    const { examName, targetDate, dailyGoalHours, progressStats, remainingDays } = req.body;
    if (!examName || !targetDate || remainingDays === undefined) {
      return res.status(400).json({ error: 'examName, targetDate, and remainingDays are required' });
    }
    const plan = await generateStudyPlan({ examName, targetDate, dailyGoalHours, progressStats, remainingDays });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/compare-exams', async (req, res) => {
  try {
    const { examA, examB, topicsA, topicsB } = req.body;
    if (!examA || !examB || !topicsA || !topicsB) {
      return res.status(400).json({ error: 'examA, examB, topicsA, and topicsB are required' });
    }
    const comparison = await compareExams({ examA, examB, topicsA, topicsB });
    res.json({ comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, examName, categoryName, targetDate, progressStats } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const reply = await chatStudyBuddy({
      message,
      history: history || [],
      examName: examName || 'General Exam',
      categoryName: categoryName || 'General',
      targetDate: targetDate || '',
      progressStats: progressStats || {}
    });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SERVER START
// ----------------------------------------------------
app.listen(port, () => {
  console.log(`ProgressPad backend server running on port ${port}`);
});
