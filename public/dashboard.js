const habitList = document.getElementById("habitList");
const habitForm = document.getElementById("habitForm");
const markAllDoneButton = document.getElementById("markAllDoneButton");
const logoutButton = document.getElementById("logoutButton");
const dashboardMessage = document.getElementById("dashboardMessage");

function showDashboardMessage(message, type) {
    dashboardMessage.textContent = message;
    dashboardMessage.className = `flash-message ${type}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getTodayLabel() {
    return new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function renderDashboard(data) {
    document.getElementById("todayDate").textContent = getTodayLabel();
    document.getElementById("totalHabits").textContent = data.summary.totalHabits;
    document.getElementById("completedHabits").textContent = data.summary.completedToday;
    document.getElementById("streak").textContent = data.summary.streak;
    document.getElementById("completionRate").textContent = `${data.summary.completionRate}%`;
    document.getElementById("heroCompletion").textContent = `${data.summary.completionRate}% Complete`;
    document.getElementById("heroFocus").textContent = data.summary.focusHabit;

    if (!data.summary.totalHabits) {
        document.getElementById("summaryText").textContent = "Add a habit to start building your routine.";
        habitList.innerHTML = '<div class="empty-state">No habits added yet. Add your first habit to begin your routine.</div>';
        return;
    }

    document.getElementById("summaryText").textContent =
        data.summary.completedToday === data.summary.totalHabits
            ? "Excellent work. You completed every habit scheduled for today."
            : `You have completed ${data.summary.completedToday} of ${data.summary.totalHabits} habits today. Keep the streak alive.`;

    habitList.innerHTML = data.habits
        .map(
            (habit) => `
                <div class="habit-card">
                    <div class="habit-top">
                        <div>
                            <h3 class="habit-title">${habit.name}</h3>
                            <div class="habit-meta">${habit.category} • ${habit.frequency}</div>
                            <div class="habit-meta">Created: ${formatDate(habit.createdAt)}</div>
                        </div>
                        <div class="status-pill ${habit.done ? "status-done" : "status-pending"}">
                            ${habit.done ? "Completed" : "Pending"}
                        </div>
                    </div>
                    <div class="progress-shell">
                        <div class="progress-bar" style="width: ${habit.progress}%"></div>
                    </div>
                    <div class="habit-meta">Progress: ${habit.progress}%</div>
                    <div class="habit-actions">
                        <button class="btn-primary" type="button" onclick="toggleHabit(${habit.id})">
                            ${habit.done ? "Undo" : "Complete"}
                        </button>
                        <button class="btn-secondary" type="button" onclick="editHabit(${habit.id}, '${habit.name.replace(/'/g, "\\'")}', '${habit.category.replace(/'/g, "\\'")}', '${habit.frequency.replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn-danger" type="button" onclick="deleteHabit(${habit.id})">Delete</button>
                    </div>
                </div>
            `
        )
        .join("");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }
    return data;
}

async function loadUser() {
    try {
        const data = await fetchJson("/api/auth/me");
        document.getElementById("welcomeUser").textContent = `Hi, ${data.user.username}`;
        document.getElementById("accountUsername").textContent = data.user.username;
    } catch (error) {
        window.location.href = "/login";
    }
}

async function loadHabits() {
    try {
        const data = await fetchJson("/api/habits");
        renderDashboard(data);
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
}

habitForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await fetchJson("/api/habits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: document.getElementById("habitInput").value.trim(),
                category: document.getElementById("categoryInput").value,
                frequency: document.getElementById("frequencyInput").value
            })
        });

        habitForm.reset();
        document.getElementById("categoryInput").value = "Health";
        document.getElementById("frequencyInput").value = "Daily";
        renderDashboard(data);
        showDashboardMessage("Habit added successfully.", "success");
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
});

async function toggleHabit(id) {
    try {
        const data = await fetchJson(`/api/habits/${id}/toggle`, {
            method: "PATCH"
        });
        renderDashboard(data);
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
}

async function deleteHabit(id) {
    if (!window.confirm("Delete this habit?")) {
        return;
    }

    try {
        const data = await fetchJson(`/api/habits/${id}`, {
            method: "DELETE"
        });
        renderDashboard(data);
        showDashboardMessage("Habit deleted.", "success");
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
}

async function editHabit(id, currentName, currentCategory, currentFrequency) {
    const updatedName = window.prompt("Edit habit name:", currentName);
    if (updatedName === null) {
        return;
    }

    const cleanedName = updatedName.trim();
    if (!cleanedName) {
        showDashboardMessage("Habit name cannot be empty.", "error");
        return;
    }

    const updatedCategory = window.prompt("Edit category:", currentCategory);
    if (updatedCategory === null || !updatedCategory.trim()) {
        return;
    }

    const updatedFrequency = window.prompt("Edit frequency:", currentFrequency);
    if (updatedFrequency === null || !updatedFrequency.trim()) {
        return;
    }

    try {
        const data = await fetchJson(`/api/habits/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: cleanedName,
                category: updatedCategory.trim(),
                frequency: updatedFrequency.trim()
            })
        });
        renderDashboard(data);
        showDashboardMessage("Habit updated.", "success");
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
}

markAllDoneButton.addEventListener("click", async () => {
    try {
        const data = await fetchJson("/api/habits/complete-all", {
            method: "POST"
        });
        renderDashboard(data);
        showDashboardMessage("All habits marked as completed.", "success");
    } catch (error) {
        showDashboardMessage(error.message, "error");
    }
});

logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
});

window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
window.editHabit = editHabit;

window.addEventListener("DOMContentLoaded", async () => {
    await loadUser();
    await loadHabits();
});
