function getTodayString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getYesterdayString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

function calculateStreaks(completedDates = []) {
  if (!completedDates.length) {
    return {
      streakCount: 0,
      longestStreak: 0,
      lastCompletedAt: null,
      totalCheckIns: 0,
    };
  }

  const uniqueDates = [...new Set(completedDates)].sort();

  let longestStreak = 1;
  let currentRun = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const yesterday = getYesterdayString(uniqueDates[index]);

    if (uniqueDates[index - 1] === yesterday) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  let streakCount = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const yesterday = getYesterdayString(uniqueDates[index]);
    if (uniqueDates[index - 1] === yesterday) {
      streakCount += 1;
    } else {
      break;
    }
  }

  return {
    streakCount,
    longestStreak,
    lastCompletedAt: uniqueDates[uniqueDates.length - 1],
    totalCheckIns: uniqueDates.length,
  };
}

module.exports = {
  calculateStreaks,
  getTodayString,
};

