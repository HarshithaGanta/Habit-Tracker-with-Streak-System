import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from fastapi.exceptions import RequestValidationError
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "habit_tracker.db"))).expanduser()
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

JWT_SECRET = os.getenv("JWT_SECRET", "replace_this_secret")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
CLIENT_URLS = [
    origin.strip()
    for origin in os.getenv("CLIENT_URL", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI(title="Habit Tracker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CLIENT_URLS or ["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupPayload(AuthPayload):
    name: str = Field(min_length=1, max_length=120)


class HabitPayload(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    category: str = Field(default="Personal", max_length=60)
    color: str = Field(default="#ff7b54", max_length=20)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    message = first_error.get("msg", "Invalid request.")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": message},
    )


def get_now() -> datetime:
    for zone_name in (APP_TIMEZONE, "Asia/Calcutta", "UTC"):
        try:
            return datetime.now(ZoneInfo(zone_name))
        except ZoneInfoNotFoundError:
            continue
    return datetime.utcnow()


def get_today_string() -> str:
    return get_now().date().isoformat()


def create_access_token(user_id: int) -> str:
    expires_at = get_now() + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


@contextmanager
def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database() -> None:
    with get_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'Personal',
                color TEXT NOT NULL DEFAULT '#ff7b54',
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS habit_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL,
                completed_date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(habit_id, completed_date),
                FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
            )
            """
        )


@app.on_event("startup")
def startup_event() -> None:
    initialize_database()


def fetch_user_by_email(email: str) -> Optional[sqlite3.Row]:
    with get_db() as connection:
        return connection.execute(
            "SELECT id, name, email, password, created_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()


def fetch_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    with get_db() as connection:
        return connection.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()


def build_user_response(user: sqlite3.Row) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "createdAt": user["created_at"],
    }


def get_current_user(authorization: Optional[str] = Header(default=None)) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user = fetch_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_habit_completion_dates(connection: sqlite3.Connection, habit_id: int) -> list[str]:
    rows = connection.execute(
        """
        SELECT completed_date
        FROM habit_completions
        WHERE habit_id = ?
        ORDER BY completed_date ASC
        """,
        (habit_id,),
    ).fetchall()
    return [row["completed_date"] for row in rows]


def calculate_streak_metrics(completed_dates: list[str]) -> dict:
    if not completed_dates:
        return {
            "streakCount": 0,
            "longestStreak": 0,
            "totalCheckIns": 0,
            "lastCompletedAt": None,
        }

    longest_streak = 1
    current_streak = 1

    for index in range(1, len(completed_dates)):
        current_date = datetime.fromisoformat(completed_dates[index]).date()
        previous_date = datetime.fromisoformat(completed_dates[index - 1]).date()
        if current_date - previous_date == timedelta(days=1):
            current_streak += 1
            longest_streak = max(longest_streak, current_streak)
        else:
            current_streak = 1

    parsed_dates = [datetime.fromisoformat(value).date() for value in completed_dates]
    last_completed_date = parsed_dates[-1]
    today = get_now().date()
    yesterday = today - timedelta(days=1)

    active_streak = 0
    if last_completed_date in {today, yesterday}:
        active_streak = 1

    for index in range(len(parsed_dates) - 1, 0, -1):
        current_date = parsed_dates[index]
        previous_date = parsed_dates[index - 1]
        if current_date - previous_date == timedelta(days=1):
            if active_streak:
                active_streak += 1
        else:
            break

    return {
        "streakCount": active_streak,
        "longestStreak": longest_streak,
        "totalCheckIns": len(completed_dates),
        "lastCompletedAt": completed_dates[-1],
    }


def build_habit_response(connection: sqlite3.Connection, habit: sqlite3.Row) -> dict:
    completed_dates = get_habit_completion_dates(connection, habit["id"])
    metrics = calculate_streak_metrics(completed_dates)
    today = get_today_string()

    return {
        "_id": str(habit["id"]),
        "title": habit["title"],
        "description": habit["description"],
        "category": habit["category"],
        "color": habit["color"],
        "streakCount": metrics["streakCount"],
        "longestStreak": metrics["longestStreak"],
        "totalCheckIns": metrics["totalCheckIns"],
        "lastCompletedAt": metrics["lastCompletedAt"],
        "completedToday": today in completed_dates,
        "createdAt": habit["created_at"],
    }


def get_habit_for_user(
    connection: sqlite3.Connection,
    habit_id: int,
    user_id: int,
) -> Optional[sqlite3.Row]:
    return connection.execute(
        """
        SELECT id, title, description, category, color, created_at
        FROM habits
        WHERE id = ? AND user_id = ?
        """,
        (habit_id, user_id),
    ).fetchone()


@app.get("/")
def health_check() -> dict:
    return {"message": "Habit Tracker FastAPI backend is running"}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupPayload) -> dict:
    email = payload.email.lower().strip()
    if fetch_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists.")

    created_at = get_now().isoformat()
    with get_db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (name, email, password, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload.name.strip(),
                email,
                hash_password(payload.password),
                created_at,
            ),
        )
        user_id = cursor.lastrowid

    user = fetch_user_by_id(user_id)
    return {
        "token": create_access_token(user_id),
        "user": build_user_response(user),
    }


@app.post("/api/auth/login")
def login(payload: AuthPayload) -> dict:
    user = fetch_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    return {
        "token": create_access_token(user["id"]),
        "user": build_user_response(user),
    }


@app.get("/api/user/profile")
def get_profile(current_user: sqlite3.Row = Depends(get_current_user)) -> dict:
    return build_user_response(current_user)


@app.get("/api/habits")
def get_habits(current_user: sqlite3.Row = Depends(get_current_user)) -> dict:
    with get_db() as connection:
        habits = connection.execute(
            """
            SELECT id, title, description, category, color, created_at
            FROM habits
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (current_user["id"],),
        ).fetchall()
        return {"habits": [build_habit_response(connection, habit) for habit in habits]}


@app.get("/api/habits/dashboard")
def get_dashboard(current_user: sqlite3.Row = Depends(get_current_user)) -> dict:
    with get_db() as connection:
        habits = connection.execute(
            """
            SELECT id, title, description, category, color, created_at
            FROM habits
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (current_user["id"],),
        ).fetchall()
        habit_responses = [build_habit_response(connection, habit) for habit in habits]

    total_habits = len(habit_responses)
    completed_today = len([habit for habit in habit_responses if habit["completedToday"]])
    best_streak = max((habit["longestStreak"] for habit in habit_responses), default=0)
    total_check_ins = sum(habit["totalCheckIns"] for habit in habit_responses)
    completion_rate = round((completed_today / total_habits) * 100) if total_habits else 0

    return {
        "summary": {
            "totalHabits": total_habits,
            "completedToday": completed_today,
            "completionRate": completion_rate,
            "bestStreak": best_streak,
            "totalCheckIns": total_check_ins,
        }
    }


@app.post("/api/habits", status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitPayload,
    current_user: sqlite3.Row = Depends(get_current_user),
) -> dict:
    created_at = get_now().isoformat()
    with get_db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO habits (user_id, title, description, category, color, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.title.strip(),
                payload.description.strip(),
                payload.category.strip(),
                payload.color.strip(),
                created_at,
            ),
        )
        habit_id = cursor.lastrowid
        habit = connection.execute(
            """
            SELECT id, title, description, category, color, created_at
            FROM habits
            WHERE id = ?
            """,
            (habit_id,),
        ).fetchone()

        return {"habit": build_habit_response(connection, habit)}


@app.put("/api/habits/{habit_id}")
def update_habit(
    habit_id: int,
    payload: HabitPayload,
    current_user: sqlite3.Row = Depends(get_current_user),
) -> dict:
    with get_db() as connection:
        habit = get_habit_for_user(connection, habit_id, current_user["id"])
        if not habit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found.")

        connection.execute(
            """
            UPDATE habits
            SET title = ?, description = ?, category = ?, color = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                payload.title.strip(),
                payload.description.strip(),
                payload.category.strip(),
                payload.color.strip(),
                habit_id,
                current_user["id"],
            ),
        )

        updated_habit = get_habit_for_user(connection, habit_id, current_user["id"])
        return {"habit": build_habit_response(connection, updated_habit)}


@app.patch("/api/habits/{habit_id}/toggle")
def toggle_habit(
    habit_id: int,
    current_user: sqlite3.Row = Depends(get_current_user),
) -> dict:
    today = get_today_string()
    now = get_now().isoformat()

    with get_db() as connection:
        habit = get_habit_for_user(connection, habit_id, current_user["id"])

        if not habit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found.")

        existing_completion = connection.execute(
            """
            SELECT id
            FROM habit_completions
            WHERE habit_id = ? AND completed_date = ?
            """,
            (habit_id, today),
        ).fetchone()

        if existing_completion:
            connection.execute(
                "DELETE FROM habit_completions WHERE id = ?",
                (existing_completion["id"],),
            )
        else:
            connection.execute(
                """
                INSERT INTO habit_completions (habit_id, completed_date, created_at)
                VALUES (?, ?, ?)
                """,
                (habit_id, today, now),
            )

        updated_habit = connection.execute(
            """
            SELECT id, title, description, category, color, created_at
            FROM habits
            WHERE id = ?
            """,
            (habit_id,),
        ).fetchone()

        return {"habit": build_habit_response(connection, updated_habit)}


@app.delete("/api/habits/{habit_id}")
def delete_habit(
    habit_id: int,
    current_user: sqlite3.Row = Depends(get_current_user),
) -> dict:
    with get_db() as connection:
        deleted = connection.execute(
            "DELETE FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, current_user["id"]),
        )
        if deleted.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found.")

    return {"message": "Habit deleted successfully."}
