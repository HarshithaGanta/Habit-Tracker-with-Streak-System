const express = require("express");
const {
  createHabit,
  deleteHabit,
  getDashboard,
  getHabits,
  toggleHabitCompletion,
} = require("../controllers/habitController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", getHabits);
router.get("/dashboard", getDashboard);
router.post("/", createHabit);
router.patch("/:id/toggle", toggleHabitCompletion);
router.delete("/:id", deleteHabit);

module.exports = router;
