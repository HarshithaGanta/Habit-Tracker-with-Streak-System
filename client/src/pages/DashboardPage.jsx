import { useContext, useEffect, useState } from "react";
import HabitCard from "../components/HabitCard";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

const habitFormState = {
  title: "",
  description: "",
  category: "Personal",
  color: "#ff7b54",
};

const fallbackSummary = {
  totalHabits: 0,
  completedToday: 0,
  completionRate: 0,
  bestStreak: 0,
  totalCheckIns: 0,
};

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const [habits, setHabits] = useState([]);
  const [summary, setSummary] = useState(fallbackSummary);
  const [formData, setFormData] = useState(habitFormState);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingHabitId, setWorkingHabitId] = useState("");
  const [editingHabitId, setEditingHabitId] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setError("");

    try {
      const [habitResponse, dashboardResponse] = await Promise.all([
        api.get("/habits"),
        api.get("/habits/dashboard"),
      ]);

      setHabits(habitResponse.data.habits);
      setSummary(dashboardResponse.data.summary);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your dashboard.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleAddHabit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Habit title is required.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        color: formData.color,
      };

      if (editingHabitId) {
        await api.put(`/habits/${editingHabitId}`, payload);
      } else {
        await api.post("/habits", payload);
      }

      setFormData(habitFormState);
      setEditingHabitId("");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create habit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHabit = async (habitId) => {
    setWorkingHabitId(habitId);
    setError("");

    try {
      await api.patch(`/habits/${habitId}/toggle`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update habit.");
    } finally {
      setWorkingHabitId("");
    }
  };

  const handleDeleteHabit = async (habitId) => {
    setWorkingHabitId(habitId);
    setError("");

    try {
      await api.delete(`/habits/${habitId}`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete habit.");
    } finally {
      setWorkingHabitId("");
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabitId(habit._id);
    setFormData({
      title: habit.title,
      description: habit.description || "",
      category: habit.category || "Personal",
      color: habit.color || "#ff7b54",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingHabitId("");
    setFormData(habitFormState);
    setError("");
  };

  const completedHabits = habits.filter((habit) => habit.completedToday).length;

  if (pageLoading) {
    return (
      <div className="screen-loader">
        <div className="loader-panel">
          <span className="loader-orb" />
          <p>Building your habit dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow-badge soft">Streak dashboard</span>
          <h1>Build habits that keep their fire.</h1>
          <p>
            Welcome back, {user?.name}. Track your daily wins, lock in today&apos;s check-ins,
            and keep your streak logic front and center.
          </p>
        </div>

        <div className="hero-actions">
          <div className="profile-card">
            <span>Signed in as</span>
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      {error ? <p className="form-error banner-error">{error}</p> : null}

      <section className="summary-grid">
        <article className="summary-card">
          <span>Total habits</span>
          <strong>{summary.totalHabits}</strong>
          <small>Daily routines currently active</small>
        </article>
        <article className="summary-card hot">
          <span>Completed today</span>
          <strong>{summary.completedToday}</strong>
          <small>{completedHabits} habits checked off right now</small>
        </article>
        <article className="summary-card">
          <span>Completion rate</span>
          <strong>{summary.completionRate}%</strong>
          <small>Daily follow-through across all habits</small>
        </article>
        <article className="summary-card">
          <span>Best streak</span>
          <strong>{summary.bestStreak} days</strong>
          <small>Total check-ins: {summary.totalCheckIns}</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <article className="panel-card form-panel">
            <div className="panel-head">
              <div>
                <span className="mini-label">Create habit</span>
                <h2>{editingHabitId ? "Update your habit" : "Add a new daily habit"}</h2>
              </div>
            </div>

            <form className="habit-form" onSubmit={handleAddHabit}>
              <label>
                <span>Habit title</span>
                <input
                  type="text"
                  name="title"
                  placeholder="Read 10 pages"
                  value={formData.title}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  placeholder="Keep it clear and realistic."
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                />
              </label>

              <div className="form-row">
                <label>
                  <span>Category</span>
                  <select name="category" value={formData.category} onChange={handleChange}>
                    <option>Personal</option>
                    <option>Health</option>
                    <option>Study</option>
                    <option>Fitness</option>
                    <option>Work</option>
                  </select>
                </label>

                <label>
                  <span>Accent color</span>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <button type="submit" className="primary-button wide-button" disabled={submitting}>
                {submitting
                  ? editingHabitId
                    ? "Saving changes..."
                    : "Adding habit..."
                  : editingHabitId
                    ? "Save Habit"
                    : "Add Habit"}
              </button>

              {editingHabitId ? (
                <button
                  type="button"
                  className="ghost-button wide-button"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              ) : null}
            </form>
          </article>

          <article className="panel-card habits-panel">
            <div className="panel-head">
              <div>
                <span className="mini-label">Habits</span>
                <h2>Your daily system</h2>
              </div>
            </div>

            <div className="habit-list">
              {habits.length ? (
                habits.map((habit) => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    onToggle={handleToggleHabit}
                    onEdit={handleEditHabit}
                    onDelete={handleDeleteHabit}
                    isWorking={workingHabitId === habit._id}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <strong>No habits yet</strong>
                  <p>Add your first habit to start building streaks.</p>
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-column side-column">
          <article className="panel-card insight-panel">
            <span className="mini-label">Progress pulse</span>
            <h2>Today&apos;s momentum</h2>
            <div className="radial-shell">
              <div
                className="radial-meter"
                style={{
                  "--meter-fill": `${summary.completionRate}%`,
                }}
              >
                <div>
                  <strong>{summary.completionRate}%</strong>
                  <small>completion</small>
                </div>
              </div>
            </div>
            <ul className="insight-list">
              <li>{summary.completedToday} habits finished today</li>
              <li>{summary.bestStreak} day best streak across your board</li>
              <li>{summary.totalCheckIns} total consistency marks logged</li>
            </ul>
          </article>

          <article className="panel-card profile-panel">
            <span className="mini-label">Profile</span>
            <h2>Account details</h2>
            <div className="profile-detail">
              <span>Name</span>
              <strong>{user?.name}</strong>
            </div>
            <div className="profile-detail">
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div className="profile-detail">
              <span>Why this stands out</span>
              <strong>Clean UI + real streak logic + protected full stack flow</strong>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
