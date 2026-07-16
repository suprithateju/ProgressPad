import sqlite3 from 'sqlite3';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');

const usePostgres = !!process.env.DATABASE_URL;
let db = null;
let pgPool = null;

if (usePostgres) {
  console.log('PostgreSQL DATABASE_URL found. Initializing PG database driver pool...');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for hosted PG like Supabase/Neon
    }
  });
} else {
  console.log('Using SQLite fallback database driver.');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
    } else {
      console.log('SQLite database connected successfully at:', dbPath);
    }
  });
}

// Convert SQLite '?' placeholders to PostgreSQL '$1, $2, ...' placeholders
// and translate syntax like 'INSERT OR IGNORE'
const translateSql = (sql) => {
  if (!usePostgres) return sql;

  let index = 1;
  let pgSql = sql.replace(/\?/g, () => `$${index++}`);

  // Convert SQLite-specific INSERT OR IGNORE INTO user_topic_progress
  if (/INSERT OR IGNORE INTO user_topic_progress/i.test(pgSql)) {
    pgSql = pgSql.replace(/INSERT OR IGNORE INTO user_topic_progress/gi, 'INSERT INTO user_topic_progress');
    if (!/ON CONFLICT/i.test(pgSql)) {
      pgSql += ' ON CONFLICT (user_exam_id, topic_id) DO NOTHING';
    }
  }

  // Convert SQLite-specific INSERT OR IGNORE INTO topics (seed / onboarding)
  if (/INSERT OR IGNORE INTO topics/i.test(pgSql)) {
    pgSql = pgSql.replace(/INSERT OR IGNORE INTO topics/gi, 'INSERT INTO topics');
    if (!/ON CONFLICT/i.test(pgSql)) {
      pgSql += ' ON CONFLICT (pool_key, section, topic) DO NOTHING';
    }
  }

  return pgSql;
};

// Helper function to query the database using Promises
export const query = (sql, params = []) => {
  if (usePostgres) {
    const pgSql = translateSql(sql);
    return pgPool.query(pgSql, params).then(res => res.rows);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql, params = []) => {
  if (usePostgres) {
    const pgSql = translateSql(sql);
    return pgPool.query(pgSql, params).then(res => res.rows[0] || null);
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  if (usePostgres) {
    // Skip SQLite-specific PRAGMA commands
    if (/PRAGMA/i.test(sql)) {
      return Promise.resolve({ id: null, changes: 0 });
    }
    const pgSql = translateSql(sql);
    return pgPool.query(pgSql, params).then(res => {
      return { id: null, changes: res.rowCount || 0 };
    });
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Initialize database tables
export const initDB = async () => {
  // Enable foreign keys on SQLite
  if (!usePostgres) {
    await run('PRAGMA foreign_keys = ON;');
  }

  // 1. Exam Categories
  await run(`
    CREATE TABLE IF NOT EXISTS exam_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT,
      color_ramp TEXT,
      sort_order INTEGER
    );
  `);

  // 2. Exams
  await run(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT,
      conducting_body TEXT,
      frequency TEXT,
      tiers TEXT, -- JSON string
      marking_scheme TEXT, -- JSON string
      safe_cutoff REAL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY(category_id) REFERENCES exam_categories(id) ON DELETE SET NULL
    );
  `);

  // 3. Exam Subjects
  await run(`
    CREATE TABLE IF NOT EXISTS exam_subjects (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      color TEXT,
      max_marks INTEGER,
      question_count INTEGER,
      sort_order INTEGER,
      shared_pool_key TEXT,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
  `);

  // 4. Topics (Shared Pool)
  await run(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      pool_key TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      section TEXT,
      topic TEXT NOT NULL,
      is_template INTEGER DEFAULT 1,
      difficulty TEXT,
      avg_weightage REAL,
      UNIQUE(pool_key, section, topic)
    );
  `);

  // 5. Exam Topic Map
  await run(`
    CREATE TABLE IF NOT EXISTS exam_topic_map (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      priority TEXT,
      recommended_resource TEXT,
      resource_chapter TEXT,
      sort_order INTEGER,
      is_optional INTEGER DEFAULT 0,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(subject_id) REFERENCES exam_subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );
  `);

  // 6. User Exams (exams the user is preparing for)
  await run(`
    CREATE TABLE IF NOT EXISTS user_exams (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '1',
      exam_id TEXT NOT NULL,
      target_date TEXT,
      is_primary INTEGER DEFAULT 0,
      enrolled_at TEXT,
      daily_goal_hrs REAL DEFAULT 2.0,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
  `);

  // 7. User Topic Progress (user progress in topics)
  await run(`
    CREATE TABLE IF NOT EXISTS user_topic_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '1',
      user_exam_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      status TEXT DEFAULT 'Not Started',
      done INTEGER DEFAULT 0,
      notes TEXT,
      done_at TEXT,
      ease_factor REAL DEFAULT 2.5,
      next_review_at TEXT,
      difficulty_rating INTEGER,
      FOREIGN KEY(user_exam_id) REFERENCES user_exams(id) ON DELETE CASCADE,
      FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE,
      UNIQUE(user_exam_id, topic_id)
    );
  `);

  // 8. Mock Tests
  await run(`
    CREATE TABLE IF NOT EXISTS mock_tests (
      id TEXT PRIMARY KEY,
      user_exam_id TEXT NOT NULL,
      name TEXT NOT NULL,
      test_date TEXT NOT NULL,
      section_scores TEXT NOT NULL, -- JSON string
      total_score REAL NOT NULL,
      max_score REAL NOT NULL,
      tier TEXT,
      notes TEXT,
      FOREIGN KEY(user_exam_id) REFERENCES user_exams(id) ON DELETE CASCADE
    );
  `);

  console.log('Database schema checked/initialized.');
};

export default db;
