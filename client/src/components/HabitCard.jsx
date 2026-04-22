function formatLastCompleted(lastCompletedAt) {
  if (!lastCompletedAt) {
    return "Not completed yet";
  }

  return `Last check: ${lastCompletedAt}`;
}

export default function HabitCard({ habit, onToggle, onDelete, isWorking }) {
  const progressWidth = Math.min(habit.streakCount * 12, 100);

  return (
    <article className="habit-card" style={{ "--habit-accent": habit.color }}>
      <div className="habit-card-top">
        <div>
          <span className="habit-chip">{habit.category}</span>
          <h3>{habit.title}</h3>
          <p>{habit.description || "Small steps, repeated daily, create the big shift."}</p>
        </div>
        <div className="habit-fire">
          <span>🔥</span>
          <strong>{habit.streakCount}</strong>
        </div>
      </div>

      <div className="habit-progress">
        <div className="habit-progress-bar">
          <span style={{ width: `${progressWidth}%` }} />
        </div>
        <small>{habit.completedToday ? "Completed for today" : "Ready for today's check-in"}</small>
      </div>

      <div className="habit-meta">
        <div>
          <span>Longest streak</span>
          <strong>{habit.longestStreak} days</strong>
        </div>
        <div>
          <span>Total check-ins</span>
          <strong>{habit.totalCheckIns}</strong>
        </div>
      </div>

      <div className="habit-footer">
        <small>{formatLastCompleted(habit.lastCompletedAt)}</small>
        <div className="habit-actions">
          <button
            type="button"
            className={`primary-button ${habit.completedToday ? "completed" : ""}`}
            onClick={() => onToggle(habit._id)}
            disabled={isWorking}
          >
            {isWorking
              ? "Saving..."
              : habit.completedToday
                ? "Undo Today"
                : "Mark Complete"}
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={() => onDelete(habit._id)}
            disabled={isWorking}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

