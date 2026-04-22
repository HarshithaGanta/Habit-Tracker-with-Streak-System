# Habit Tracker With Streak System

A full-stack habit tracker built with React, FastAPI, SQLite, and JWT authentication. Users can create accounts, log in securely, store habits in a real database, mark daily completions, edit or delete habits, and view streak-based progress on a protected dashboard.

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- Database: SQLite stored on the backend
- Authentication: JWT + hashed passwords
- Styling: Custom responsive CSS

## Features

- Secure signup and login
- Password hashing on the backend
- JWT-based protected routes
- Add daily habits with optional category and color accent
- Edit and delete existing habits
- Mark habits complete for today
- Streak system with active streak and longest streak
- Progress dashboard with completion rate and daily insights
- Logout, form validation, and loading states

## Project Structure

```text
Habit-Tracker-with-Streak-System/
├── client/
├── server/
│   ├── app/
│   ├── data/
│   └── requirements.txt
├── package.json
└── README.md
```

## Local Setup

### 1. Install dependencies

```bash
npm install
npm run install-all
pip install -r server/requirements.txt
```

### 2. Configure environment variables

Create `server/.env` from `server/.env.example`.

```env
PORT=5000
JWT_SECRET=replace_with_a_secure_secret
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
APP_TIMEZONE=Asia/Kolkata
DATABASE_PATH=server/data/habit_tracker.db
```

Create `client/.env` from `client/.env.example` if you want a custom backend URL.

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- SQLite database file: `server/data/habit_tracker.db`

## API Endpoints

### Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`

### User

- `GET /api/user/profile` protected

### Habits

- `GET /api/habits` protected
- `GET /api/habits/dashboard` protected
- `POST /api/habits` protected
- `PUT /api/habits/:id` protected
- `PATCH /api/habits/:id/toggle` protected
- `DELETE /api/habits/:id` protected

## Deployment

### Frontend

Deploy `client/` to Vercel or Netlify.

- Build command: `npm run build`
- Output directory: `dist`

### Backend

Deploy `server/` to Render or Railway.

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- If you deploy on Render with SQLite, use a persistent disk and set `DATABASE_PATH=/var/data/habit_tracker.db`

### Database

The app uses SQLite, so user accounts, habits, and completion history are stored directly by the FastAPI backend. For local development the default file is `server/data/habit_tracker.db`. In production, set `DATABASE_PATH` to a persistent location.

## GitHub Publishing

1. Create a new GitHub repository for this project.
2. Initialize or connect git inside `Habit-Tracker-with-Streak-System/`.
3. Commit the project files.
4. Push the branch to your new GitHub repository.

This project should live in its own repository because it is unrelated to the waste-segregation repo currently configured in the parent folder.
