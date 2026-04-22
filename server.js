const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const SQLiteStoreFactory = require("connect-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret =
    process.env.SESSION_SECRET || "replace-this-with-an-env-secret-in-production";

const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dataDir, "habit-tracker.db"));
const SQLiteStore = SQLiteStoreFactory(session);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        store: new SQLiteStore({
            db: "sessions.db",
            dir: dataDir
        }),
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            sameSite: "lax",
            secure: isProduction
        }
    })
);

if (isProduction) {
    app.set("trust proxy", 1);
}
app.use("/assets", express.static(path.join(__dirname, "public")));

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            frequency TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            completed_on TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(habit_id, completed_on),
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        )
    `);
});

function run(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }
            resolve(this);
        });
    });
}

function get(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(row);
        });
    });
}

function all(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(rows);
        });
    });
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function requireAuth(req, res, next) {
    if (!req.session.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}

async function buildDashboard(userId) {
    const today = todayKey();
    const habits = await all(
        `
        SELECT
            h.id,
            h.name,
            h.category,
            h.frequency,
            h.created_at,
            CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END AS done_today
        FROM habits h
        LEFT JOIN habit_logs hl
            ON hl.habit_id = h.id
            AND hl.completed_on = ?
        WHERE h.user_id = ?
        ORDER BY h.created_at DESC, h.id DESC
        `,
        [today, userId]
    );

    const completedToday = habits.filter((habit) => habit.done_today).length;
    const totalHabits = habits.length;
    const completionRate = totalHabits ? Math.round((completedToday / totalHabits) * 100) : 0;

    const fullDays = await all(
        `
        SELECT completed_on, COUNT(*) AS completed_count
        FROM habit_logs hl
        INNER JOIN habits h ON h.id = hl.habit_id
        WHERE h.user_id = ?
        GROUP BY completed_on
        ORDER BY completed_on DESC
        `,
        [userId]
    );

    let streak = 0;
    if (totalHabits > 0) {
        const byDate = new Map(fullDays.map((entry) => [entry.completed_on, entry.completed_count]));
        const cursor = new Date();

        while (true) {
            const date = cursor.toISOString().slice(0, 10);
            const count = byDate.get(date) || 0;
            if (count === totalHabits) {
                streak += 1;
                cursor.setDate(cursor.getDate() - 1);
                continue;
            }
            break;
        }
    }

    return {
        date: today,
        summary: {
            totalHabits,
            completedToday,
            completionRate,
            streak,
            focusHabit: habits.find((habit) => !habit.done_today)?.name || "All habits completed"
        },
        habits: habits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            category: habit.category,
            frequency: habit.frequency,
            createdAt: habit.created_at,
            done: Boolean(habit.done_today),
            progress: habit.done_today ? 100 : 0
        }))
    };
}

app.get("/", (req, res) => {
    if (req.session.user) {
        res.redirect("/app");
        return;
    }
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.redirect("/app");
        return;
    }
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signup", (req, res) => {
    if (req.session.user) {
        res.redirect("/app");
        return;
    }
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/app", (req, res) => {
    if (!req.session.user) {
        res.redirect("/login");
        return;
    }
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.post("/api/auth/signup", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const confirmPassword = String(req.body.confirmPassword || "");

        if (!username || !password || !confirmPassword) {
            res.status(400).json({ error: "All fields are required." });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: "Password must be at least 6 characters long." });
            return;
        }

        if (password !== confirmPassword) {
            res.status(400).json({ error: "Passwords do not match." });
            return;
        }

        const existingUser = await get("SELECT id FROM users WHERE username = ?", [username]);
        if (existingUser) {
            res.status(409).json({ error: "Username already exists." });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await run(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, passwordHash]
        );

        req.session.user = { id: result.lastID, username };
        res.status(201).json({ message: "Account created successfully." });
    } catch (error) {
        res.status(500).json({ error: "Unable to create account." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!username || !password) {
            res.status(400).json({ error: "Username and password are required." });
            return;
        }

        const user = await get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) {
            res.status(401).json({ error: "Invalid username or password." });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            res.status(401).json({ error: "Invalid username or password." });
            return;
        }

        req.session.user = { id: user.id, username: user.username };
        res.json({ message: "Login successful." });
    } catch (error) {
        res.status(500).json({ error: "Unable to login right now." });
    }
});

app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out." });
    });
});

app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    res.json({ user: req.session.user });
});

app.get("/api/habits", requireAuth, async (req, res) => {
    try {
        const dashboard = await buildDashboard(req.session.user.id);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to load habits." });
    }
});

app.post("/api/habits", requireAuth, async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const category = String(req.body.category || "").trim();
        const frequency = String(req.body.frequency || "").trim();

        if (!name || !category || !frequency) {
            res.status(400).json({ error: "Name, category, and frequency are required." });
            return;
        }

        await run(
            "INSERT INTO habits (user_id, name, category, frequency) VALUES (?, ?, ?, ?)",
            [req.session.user.id, name, category, frequency]
        );

        const dashboard = await buildDashboard(req.session.user.id);
        res.status(201).json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to create habit." });
    }
});

app.put("/api/habits/:id", requireAuth, async (req, res) => {
    try {
        const habitId = Number(req.params.id);
        const name = String(req.body.name || "").trim();
        const category = String(req.body.category || "").trim();
        const frequency = String(req.body.frequency || "").trim();

        if (!habitId || !name || !category || !frequency) {
            res.status(400).json({ error: "Valid habit details are required." });
            return;
        }

        const habit = await get("SELECT id FROM habits WHERE id = ? AND user_id = ?", [
            habitId,
            req.session.user.id
        ]);
        if (!habit) {
            res.status(404).json({ error: "Habit not found." });
            return;
        }

        await run(
            "UPDATE habits SET name = ?, category = ?, frequency = ? WHERE id = ?",
            [name, category, frequency, habitId]
        );

        const dashboard = await buildDashboard(req.session.user.id);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to update habit." });
    }
});

app.patch("/api/habits/:id/toggle", requireAuth, async (req, res) => {
    try {
        const habitId = Number(req.params.id);
        const habit = await get("SELECT id FROM habits WHERE id = ? AND user_id = ?", [
            habitId,
            req.session.user.id
        ]);
        if (!habit) {
            res.status(404).json({ error: "Habit not found." });
            return;
        }

        const today = todayKey();
        const existingLog = await get(
            "SELECT id FROM habit_logs WHERE habit_id = ? AND completed_on = ?",
            [habitId, today]
        );

        if (existingLog) {
            await run("DELETE FROM habit_logs WHERE id = ?", [existingLog.id]);
        } else {
            await run("INSERT INTO habit_logs (habit_id, completed_on) VALUES (?, ?)", [
                habitId,
                today
            ]);
        }

        const dashboard = await buildDashboard(req.session.user.id);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to update habit status." });
    }
});

app.post("/api/habits/complete-all", requireAuth, async (req, res) => {
    try {
        const habits = await all("SELECT id FROM habits WHERE user_id = ?", [req.session.user.id]);
        if (!habits.length) {
            res.status(400).json({ error: "There are no habits to update." });
            return;
        }

        const today = todayKey();
        for (const habit of habits) {
            await run(
                "INSERT OR IGNORE INTO habit_logs (habit_id, completed_on) VALUES (?, ?)",
                [habit.id, today]
            );
        }

        const dashboard = await buildDashboard(req.session.user.id);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to complete all habits." });
    }
});

app.delete("/api/habits/:id", requireAuth, async (req, res) => {
    try {
        const habitId = Number(req.params.id);
        const result = await run("DELETE FROM habits WHERE id = ? AND user_id = ?", [
            habitId,
            req.session.user.id
        ]);

        if (!result.changes) {
            res.status(404).json({ error: "Habit not found." });
            return;
        }

        const dashboard = await buildDashboard(req.session.user.id);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: "Unable to delete habit." });
    }
});

app.listen(PORT, () => {
    console.log(`Habit tracker running at http://localhost:${PORT}`);
});
