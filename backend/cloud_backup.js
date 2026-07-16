import { query, get, run } from './database.js';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_ID = 'progresspad_bk_v1_suppu';
const KV_URL = `https://kvdb.io/${BUCKET_ID}/user_`;

export const saveUserCloudBackup = async (email) => {
  if (!email || email === '1') return;
  console.log(`Starting cloud backup process for user: ${email}...`);
  try {
    const enrolled = await query('SELECT * FROM user_exams WHERE user_id = ?', [email]);
    const enrolledExams = {};

    for (const ue of enrolled) {
      const examId = ue.exam_id;
      
      // Get standard topic progress
      const progressRows = await query(`
        SELECT p.*, t.topic as topic_name
        FROM user_topic_progress p
        JOIN topics t ON p.topic_id = t.id
        WHERE p.user_exam_id = ? AND t.is_template = 1
      `, [ue.id]);

      const progress = {};
      progressRows.forEach(p => {
        progress[p.topic_name] = {
          done: !!p.done,
          status: p.status,
          notes: p.notes,
          done_at: p.done_at,
          ease_factor: p.ease_factor,
          next_review_at: p.next_review_at,
          difficulty_rating: p.difficulty_rating
        };
      });

      // Get custom topics
      const customTopicsRows = await query(`
        SELECT 
          t.topic, t.section, t.difficulty,
          m.subject_id, m.priority, m.recommended_resource, m.is_optional,
          p.status, p.done, p.notes, p.done_at, p.ease_factor, p.next_review_at, p.difficulty_rating
        FROM exam_topic_map m
        JOIN topics t ON m.topic_id = t.id
        LEFT JOIN user_topic_progress p ON p.topic_id = t.id AND p.user_exam_id = ?
        WHERE m.exam_id = ? AND t.is_template = 0
      `, [ue.id, examId]);

      const customTopics = customTopicsRows.map(ct => ({
        subjectId: ct.subject_id,
        section: ct.section,
        topic: ct.topic,
        priority: ct.priority,
        recommendedResource: ct.recommended_resource,
        difficulty: ct.difficulty,
        done: !!ct.done,
        status: ct.status,
        notes: ct.notes,
        done_at: ct.done_at,
        next_review_at: ct.next_review_at,
        difficulty_rating: ct.difficulty_rating
      }));

      // Get mock tests
      const mocksRows = await query('SELECT * FROM mock_tests WHERE user_exam_id = ?', [ue.id]);
      const mocks = mocksRows.map(m => ({
        name: m.name,
        testDate: m.test_date,
        sectionScores: JSON.parse(m.section_scores || '{}'),
        maxScore: m.max_score,
        tier: m.tier,
        notes: m.notes
      }));

      // Get daily tasks
      const dailyTasksRows = await query('SELECT * FROM daily_tasks WHERE user_exam_id = ?', [ue.id]);
      const dailyTasks = dailyTasksRows.map(t => ({
        taskText: t.task_text,
        subjectName: t.subject_name,
        done: !!t.done,
        createdAt: t.created_at
      }));

      // Get subject goals
      const subjectGoalsRows = await query('SELECT * FROM subject_goals WHERE user_exam_id = ?', [ue.id]);
      const subjectGoals = subjectGoalsRows.map(g => ({
        subjectId: g.subject_id,
        weeklyTargetHours: g.weekly_target_hours,
        hoursCompleted: g.hours_completed,
        createdAt: g.created_at
      }));

      enrolledExams[examId] = {
        examId,
        dailyGoalHrs: ue.daily_goal_hrs,
        progress,
        customTopics,
        mocks,
        dailyTasks,
        subjectGoals
      };
    }

    const payload = {
      user_email: email,
      enrolledExams,
      updated_at: new Date().toISOString()
    };

    const response = await fetch(`${KV_URL}${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`Cloud backup successfully saved to kvdb.io for user ${email}`);
    } else {
      console.error(`Failed to save cloud backup to kvdb.io: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('Error during cloud backup backup:', err);
  }
};

export const restoreUserCloudBackup = async (email) => {
  if (!email || email === '1') return false;
  console.log(`Checking cloud backup on kvdb.io for user: ${email}...`);
  try {
    const response = await fetch(`${KV_URL}${encodeURIComponent(email)}`);
    if (response.status === 404) {
      console.log(`No cloud backup found on kvdb.io for user ${email}`);
      return false;
    }
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const backup = await response.json();
    if (!backup || !backup.enrolledExams) {
      console.log(`Empty backup payload for user ${email}`);
      return false;
    }

    console.log(`Found cloud backup for user ${email}. Starting restore...`);

    for (const [examId, backupData] of Object.entries(backup.enrolledExams)) {
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

      // 5. Restore Daily Tasks
      if (Array.isArray(backupData.dailyTasks)) {
        for (const t of backupData.dailyTasks) {
          let existingTask = await get('SELECT id FROM daily_tasks WHERE user_exam_id = ? AND task_text = ? AND created_at = ?', [userExamId, t.taskText, t.createdAt]);
          if (!existingTask) {
            await run(`
              INSERT INTO daily_tasks (id, user_exam_id, task_text, subject_name, done, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [uuidv4(), userExamId, t.taskText, t.subjectName || null, t.done ? 1 : 0, t.createdAt]);
          }
        }
      }

      // 6. Restore Subject Goals
      if (Array.isArray(backupData.subjectGoals)) {
        for (const g of backupData.subjectGoals) {
          let existingGoal = await get('SELECT id FROM subject_goals WHERE user_exam_id = ? AND subject_id = ?', [userExamId, g.subjectId]);
          if (!existingGoal) {
            await run(`
              INSERT INTO subject_goals (id, user_exam_id, subject_id, weekly_target_hours, hours_completed, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [uuidv4(), userExamId, g.subjectId, g.weeklyTargetHours || 2.0, g.hoursCompleted || 0.0, g.createdAt]);
          }
        }
      }
    }

    console.log(`Cloud backup successfully restored for user ${email}`);
    return true;
  } catch (err) {
    console.error('Error during cloud backup restore:', err);
    return false;
  }
};
