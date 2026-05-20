# Ethara — Team Task Manager

A collaborative task management web application where teams can create projects, assign tasks, track progress, and manage members with role-based access control. Built as a simplified version of tools like Trello and Asana.

## 🚀 Submission Links

- **Live Application:** [Deploying...] (Replace with your Railway URL once deployed)
- **GitHub Repository:** [https://github.com/jessuiii/ethara-assignment](https://github.com/jessuiii/ethara-assignment)
- **Demo Video:** [Recording...] (Replace with your Loom/YouTube/Drive video link)

---

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
| Backend | Python 3, FastAPI, Uvicorn |
| Database | PostgreSQL (Supabase), SQLAlchemy (async) + asyncpg |
| Auth | JWT (python-jose), passlib (bcrypt) |
| Validation | Pydantic v2 |
| Styling | Vanilla CSS (custom design system) |
| Fonts | Sora, Plus Jakarta Sans, JetBrains Mono |
| Deployment | Render |

## Project Structure

```
ethara/
├── server/                    # FastAPI API server
│   ├── database.py            # Async SQLAlchemy engine + session
│   ├── models.py              # User, Project, ProjectMember, Task ORM models
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── auth.py                # JWT auth + role-check dependencies
│   ├── routers/               # API route handlers
│   │   ├── auth.py            # signup, login, me
│   │   ├── projects.py        # project CRUD, members
│   │   ├── tasks.py           # task CRUD with role access
│   │   └── dashboard.py       # aggregated stats
│   └── main.py                # FastAPI entry point
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── components/        # Navbar, TaskCard, TaskModal, etc.
│   │   ├── pages/             # Login, Signup, Dashboard, Projects, ProjectDetail
│   │   ├── context/           # AuthContext
│   │   └── services/          # API client
│   └── index.html
├── requirements.txt           # Python dependencies
├── package.json               # Root scripts (build + start)
└── .env.example               # Environment template
```

## Local Development Setup

### Prerequisites
- **Python** 3.11+
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

## Deployment

The application is configured to deploy seamlessly on platforms like **Render** or **Railway**. The Express backend automatically builds and serves the built React frontend SPA in production.

### Option A: Deployment on Render (100% Free)

#### 1. Create a Web Service on Render
- Go to [render.com](https://render.com/) and sign up / log in.
- Click **New +** → **Web Service**.
- Connect your GitHub repository `ethara-assignment`.

#### 2. Configure Service Settings
- **Name:** `ethara-task-manager` (or any name you prefer)
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

#### 3. Set Environment Variables
In the **Environment** tab, click **Add Environment Variable** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string (same as in `.env`) |
| `JWT_SECRET` | A strong random string (e.g., `some-random-secret-key`) |
| `NODE_ENV` | `production` |

#### 4. Deploy
- Click **Create Web Service**.
- Render will install all dependencies, build the React frontend, and start the Express server.
- Once deployed, Render will provide a public URL (e.g., `https://ethara-task-manager.onrender.com`).

---

### Option B: Deployment on Railway

#### 1. Create a Railway project
- Go to [railway.com](https://railway.com) and create a new project.
- Connect your GitHub repository.

#### 2. Set environment variables
In Railway's service settings, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string |
| `JWT_SECRET` | A strong random string |
| `NODE_ENV` | `production` |

#### 3. Deploy
Railway auto-deploys on push using the `railway.json` configuration. The Express server serves the built React SPA in production.

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

---

## 🔗 Submission Links

- **Live Application:** [Deploying...] (Replace with your Railway URL once deployed)
- **GitHub Repository:** [https://github.com/jessuiii/ethara-assignment](https://github.com/jessuiii/ethara-assignment)
- **Demo Video:** [Recording...] (Replace with your Loom/YouTube/Drive video link)

