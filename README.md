# Habit Tracker With Streak System

This project is a full-stack habit tracker built with Node.js, Express, SQLite, and session-based authentication.

## Features

- User signup and login
- Password hashing with `bcryptjs`
- Session-based authentication
- SQLite database for users, habits, and daily completion logs
- Habit create, edit, delete, and complete actions
- Daily completion rate and streak summary

## Tech Stack

- Backend: Express
- Database: SQLite
- Authentication: `express-session` + hashed passwords
- Frontend: HTML, CSS, vanilla JavaScript

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000/login`.

## Project Structure

```text
.
├── public/
├── server.js
├── package.json
└── data/                # created automatically at runtime
```

## Notes

- Database and session files are created under `data/` when the app starts.
- The current session secret is suitable for local development and should be moved to environment variables for production use.

## Deploy On Render

This repo includes a `render.yaml` file for one-click-style deployment on Render.

1. Push the branch or merge it into the branch you want to deploy.
2. In Render, create a new Blueprint instance from the GitHub repository.
3. Render will use:
   - `npm install` as the build command
   - `npm start` as the start command
   - a persistent disk mounted at `/var/data`
4. After deployment, Render will generate the live URL automatically.
