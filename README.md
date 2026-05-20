# Ethara — Team Task Manager

A collaborative task management web application where teams can create projects, assign tasks, track progress, and manage members with role-based access control. Built as a simplified version of tools like Trello and Asana.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?logo=railway&logoColor=white)

## Features

### Authentication
- Signup with name, email, and password
- Secure JWT-based login
- Protected routes with automatic session handling

### Project Management
- Create, update, and delete projects
- Project creator automatically becomes Admin
- Admin can add/remove team members by email
- Members can view their assigned projects

### Task Management
- Create tasks with title, description, due date, and priority (Low / Medium / High)
- Assign tasks to project members
- Kanban board with drag-and-drop between columns (To Do → In Progress → Done)
- Overdue task indicators

### Dashboard
- Total tasks, tasks by status, overdue task count
- Completion rate and active task summary
- Visual bar chart of task distribution
- Aggregated across all user projects

### Role-Based Access Control
| Action | Admin | Member |
|--------|:-----:|:------:|
| Create/delete project | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Create/delete tasks | ✅ | ❌ |
| Edit task (all fields) | ✅ | ❌ |
| Update task status | ✅ | ✅ (own tasks) |
| View project tasks | ✅ | ✅ |
| Dashboard | ✅ | ✅ |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase), Sequelize ORM |
| Auth | JWT, bcryptjs |
| Styling | Vanilla CSS (custom design system) |
| Fonts | Sora, Plus Jakarta Sans, JetBrains Mono |
| Deployment | Railway |

## Project Structure

```
ethara/
├── server/                    # Express API server
│   ├── config/database.js     # Sequelize + Supabase PostgreSQL config
│   ├── middleware/             # Auth, role-check, error handler
│   ├── models/                # User, Project, ProjectMember, Task
│   ├── routes/                # auth, projects, tasks, dashboard
│   └── index.js               # Entry point
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── components/        # Navbar, TaskCard, TaskModal, etc.
│   │   ├── pages/             # Login, Signup, Dashboard, Projects, ProjectDetail
│   │   ├── context/           # AuthContext
│   │   └── services/          # API client
│   └── index.html
├── package.json               # Root scripts
├── railway.json               # Railway deploy config
└── .env.example               # Environment template
```

## Local Development Setup

### Prerequisites
- **Node.js** 18+
- **Supabase account** (free tier at [supabase.com](https://supabase.com))
- **Git**

### 1. Clone the repository

```bash
git clone <repository-url>
cd ethara
```

### 2. Set up the database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning
3. Go to **Project Settings** → **Database** → **Connection string** → select **URI**
4. Copy the connection string (replace `[YOUR-PASSWORD]` with the password you set during project creation)

> **Note:** The same Supabase database works for both local development and production deployment — no need to run PostgreSQL locally.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase connection string:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL URI | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | Secret key for JWT signing | `my-super-secret-key` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

### 4. Install dependencies

```bash
npm install
```

This installs both server and client dependencies (via `postinstall` script).

### 5. Start development servers

```bash
npm run dev
```

This starts both:
- **Backend** at `http://localhost:5000`
- **Frontend** at `http://localhost:5173`

The frontend proxies `/api` requests to the backend in development.

## Deployment on Railway

### 1. Create a Railway project

- Go to [railway.com](https://railway.com) and create a new project
- Connect your GitHub repository

### 2. Set environment variables

In Railway's service settings, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string (same one from `.env`) |
| `JWT_SECRET` | A strong random string |
| `NODE_ENV` | `production` |

> **No Railway database needed** — the app connects to your Supabase PostgreSQL instance directly.

### 3. Deploy

Railway auto-deploys on push. The build process:
1. Installs server dependencies
2. Builds the React client (`npm run build`)
3. Starts the Express server (`npm start`)

The Express server serves the built React SPA in production.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List user's projects |
| `GET` | `/api/projects/:id` | Get project details |
| `PUT` | `/api/projects/:id` | Update project (admin) |
| `DELETE` | `/api/projects/:id` | Delete project (admin) |
| `POST` | `/api/projects/:id/members` | Add member (admin) |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove member (admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects/:id/tasks` | Create task (admin) |
| `GET` | `/api/projects/:id/tasks` | List project tasks |
| `PUT` | `/api/projects/:id/tasks/:taskId` | Update task |
| `DELETE` | `/api/projects/:id/tasks/:taskId` | Delete task (admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Aggregated stats |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in dev mode |
| `npm run dev:server` | Start backend only (with watch mode) |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build React client for production |
| `npm start` | Start production server |
