export const getLocalBackup = () => {
  try {
    const backup = localStorage.getItem('progresspad_backup');
    return backup ? JSON.parse(backup) : { enrolledExams: {} };
  } catch (e) {
    console.error('Failed to parse local backup:', e);
    return { enrolledExams: {} };
  }
};

export const saveLocalBackup = (backup) => {
  try {
    localStorage.setItem('progresspad_backup', JSON.stringify(backup));
  } catch (e) {
    console.error('Failed to save local backup:', e);
  }
};

// Update a specific exam's progress and custom topics in backup
export const updateExamBackup = (examId, dailyGoalHrs, syllabusList) => {
  const backup = getLocalBackup();
  
  if (!backup.enrolledExams) {
    backup.enrolledExams = {};
  }
  if (!backup.enrolledExams[examId]) {
    backup.enrolledExams[examId] = { examId };
  }
  
  const examBackup = backup.enrolledExams[examId];
  examBackup.dailyGoalHrs = dailyGoalHrs;
  examBackup.progress = examBackup.progress || {};
  examBackup.customTopics = [];

  syllabusList.forEach(subject => {
    subject.topics.forEach(topic => {
      if (topic.is_template === 0) {
        // Custom topic
        examBackup.customTopics.push({
          subjectId: subject.id,
          section: topic.section,
          topic: topic.name,
          priority: topic.priority,
          recommendedResource: topic.recommended_resource,
          difficulty: topic.canonical_difficulty,
          done: topic.done,
          status: topic.status,
          notes: topic.notes,
          done_at: topic.done_at,
          next_review_at: topic.next_review_at,
          difficulty_rating: topic.difficulty_rating
        });
      } else {
        // Standard topic progress
        if (topic.done || (topic.status && topic.status !== 'Not Started') || topic.notes || topic.difficulty_rating) {
          examBackup.progress[topic.name] = {
            done: topic.done,
            status: topic.status,
            notes: topic.notes,
            done_at: topic.done_at,
            next_review_at: topic.next_review_at,
            difficulty_rating: topic.difficulty_rating,
            ease_factor: topic.ease_factor
          };
        } else {
          // Clean up if it was set back to default
          delete examBackup.progress[topic.name];
        }
      }
    });
  });

  saveLocalBackup(backup);
};

// Update mock tests in backup
export const updateMocksBackup = (examId, mocksList) => {
  const backup = getLocalBackup();
  if (!backup.enrolledExams) {
    backup.enrolledExams = {};
  }
  if (!backup.enrolledExams[examId]) {
    backup.enrolledExams[examId] = { examId };
  }
  
  backup.enrolledExams[examId].mocks = mocksList.map(m => ({
    name: m.name,
    testDate: m.test_date,
    sectionScores: m.section_scores,
    maxScore: m.max_score,
    tier: m.tier,
    notes: m.notes
  }));

  saveLocalBackup(backup);
};
