# Habit Tracker With Streak System

A full-stack habit tracker built with React, Node.js, Express, MongoDB, and JWT authentication. Users can sign up, log in, add daily habits, mark them complete for the day, and track streaks through a polished dashboard.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas with Mongoose
- Authentication: JWT + bcryptjs
- Styling: Custom responsive CSS

## Features

- Secure signup and login
- Password hashing with bcryptjs
- JWT-based protected routes
- Add daily habits with optional category and color accent
- Mark habits complete for today
- Streak system with active streak and longest streak
- Progress dashboard with completion rate and daily insights
- Logout, form validation, and loading states

## Project Structure

```text
Habit-Tracker-with-Streak-System/
├── client/
├── server/
├── package.json
└── README.md
```

## Local Setup

### 1. Install dependencies

```bash
npm install
npm run install-all
```

### 2. Configure environment variables

Create `server/.env` from `server/.env.example`.

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_secure_secret
CLIENT_URL=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
```

Create `client/.env` if you want a custom backend URL.

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

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
- `PATCH /api/habits/:id/toggle` protected
- `DELETE /api/habits/:id` protected

## Deployment

### Frontend

Deploy `client/` to Vercel or Netlify.

- Build command: `npm run build`
- Output directory: `dist`

### Backend

Deploy `server/` to Render or Railway.

- Start command: `npm start`

### Database

Use MongoDB Atlas and add the Atlas connection string to the backend environment variables.

## Live Links

- Frontend: Add your Vercel or Netlify link here
- Backend: Add your Render or Railway link here
- Repository: [Habit-Tracker-with-Streak-System](https://github.com/HarshithaGanta/Habit-Tracker-with-Streak-System)

