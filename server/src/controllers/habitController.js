const Habit = require("../models/Habit");
const { calculateStreaks, getTodayString } = require("../utils/date");

const serializeHabit = (habit) => {
  const today = getTodayString();

  return {
    _id: habit._id.toString(),
    title: habit.title,
    description: habit.description,
    category: habit.category,
    color: habit.color,
    streakCount: habit.streakCount,
    longestStreak: habit.longestStreak,
    totalCheckIns: habit.totalCheckIns,
    lastCompletedAt: habit.lastCompletedAt,
    completedToday: habit.completedDates.includes(today),
    createdAt: habit.createdAt,
  };
};

const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id }).sort({ createdAt: -1 });

    return res.json({
      habits: habits.map(serializeHabit),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch habits." });
  }
};

const getDashboard = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id });
    const today = getTodayString();

    const totalHabits = habits.length;
    const completedToday = habits.filter((habit) => habit.completedDates.includes(today)).length;
    const totalCheckIns = habits.reduce((sum, habit) => sum + (habit.totalCheckIns || 0), 0);
    const bestStreak = habits.reduce(
      (highest, habit) => Math.max(highest, habit.longestStreak || 0),
      0
    );
    const completionRate = totalHabits
      ? Math.round((completedToday / totalHabits) * 100)
      : 0;

    return res.json({
      summary: {
        totalHabits,
        completedToday,
        completionRate,
        bestStreak,
        totalCheckIns,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch dashboard summary." });
  }
};

const createHabit = async (req, res) => {
  try {
    const { title, description, category, color } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Habit title is required." });
    }

    const habit = await Habit.create({
      user: req.user.id,
      title: title.trim(),
      description: description?.trim() || "",
      category: category?.trim() || "Personal",
      color: color?.trim() || "#ff7b54",
    });

    return res.status(201).json({
      habit: serializeHabit(habit),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create habit." });
  }
};

const toggleHabitCompletion = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user.id });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found." });
    }

    const today = getTodayString();
    const alreadyCompleted = habit.completedDates.includes(today);

    const completedDates = alreadyCompleted
      ? habit.completedDates.filter((date) => date !== today)
      : [...habit.completedDates, today];

    const streakData = calculateStreaks(completedDates);

    habit.completedDates = completedDates;
    habit.streakCount = streakData.streakCount;
    habit.longestStreak = streakData.longestStreak;
    habit.totalCheckIns = streakData.totalCheckIns;
    habit.lastCompletedAt = streakData.lastCompletedAt;

    await habit.save();

    return res.json({
      habit: serializeHabit(habit),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update habit." });
  }
};

const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found." });
    }

    return res.json({ message: "Habit deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete habit." });
  }
};

module.exports = {
  createHabit,
  deleteHabit,
  getDashboard,
  getHabits,
  toggleHabitCompletion,
};

