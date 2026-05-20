import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import * as api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  /* Normalise shape — handle various backend response structures */
  const totalTasks = stats?.totalTasks ?? stats?.tasks?.total ?? 0;
  const todoCount = stats?.todoTasks ?? stats?.tasksByStatus?.todo ?? stats?.tasks?.todo ?? 0;
  const progressCount = stats?.inProgressTasks ?? stats?.tasksByStatus?.in_progress ?? stats?.tasks?.inProgress ?? 0;
  const doneCount = stats?.doneTasks ?? stats?.tasksByStatus?.done ?? stats?.tasks?.done ?? 0;
  const overdueCount = stats?.overdueTasks ?? stats?.tasks?.overdue ?? 0;
  const projectCount = stats?.totalProjects ?? stats?.projects ?? 0;
  const tasksPerUser = Array.isArray(stats?.tasksPerUser) ? stats.tasksPerUser : [];

  /* Build a simple CSS bar chart from status counts */
  const maxBarValue = Math.max(todoCount, progressCount, doneCount, 1);
  const bars = [
    { label: 'To Do', value: todoCount, color: '#64748b' },
    { label: 'In Progress', value: progressCount, color: '#4f46e5' },
    { label: 'Done', value: doneCount, color: '#059669' },
  ];

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="page dashboard">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {firstName}</h1>
          <p>Here's what's happening across your projects.</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="dashboard-stats">
        <StatsCard label="Total Tasks" value={totalTasks} type="total" />
        <StatsCard label="To Do" value={todoCount} type="todo" />
        <StatsCard label="In Progress" value={progressCount} type="progress" />
        <StatsCard label="Completed" value={doneCount} type="done" />
        <StatsCard label="Overdue" value={overdueCount} type="overdue" />
        <StatsCard label="Projects" value={projectCount} type="projects" />
      </div>

      {/* Chart section */}
      <div className="dashboard-chart-section">
        <div className="dashboard-chart-card card">
          <h3>Tasks by Status</h3>
          <div className="dashboard-bars">
            {bars.map((bar) => (
              <div key={bar.label} className="dashboard-bar-row">
                <span className="dashboard-bar-label">{bar.label}</span>
                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
                    style={{
                      width: `${(bar.value / maxBarValue) * 100}%`,
                      backgroundColor: bar.color,
                    }}
                  />
                </div>
                <span className="dashboard-bar-value mono">{bar.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-summary-card card">
          <h3>Quick Summary</h3>
          <div className="dashboard-summary-rows">
            <div className="dashboard-summary-row">
              <span>Completion Rate</span>
              <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>
                {totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0}%
              </span>
            </div>
            <div className="dashboard-summary-row">
              <span>Active Tasks</span>
              <span className="mono">{todoCount + progressCount}</span>
            </div>
            <div className="dashboard-summary-row">
              <span>Overdue</span>
              <span className="mono" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                {overdueCount}
              </span>
            </div>
            <div className="dashboard-summary-row">
              <span>Projects</span>
              <span className="mono">{projectCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-assignees-card card">
        <h3>Tasks per User</h3>
        {tasksPerUser.length === 0 ? (
          <p className="dashboard-assignees-empty">No assigned tasks yet.</p>
        ) : (
          <div className="dashboard-assignees-list">
            {tasksPerUser
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((assignee) => (
                <div key={assignee.id} className="dashboard-assignee-row">
                  <div className="dashboard-assignee-info">
                    <span className="dashboard-assignee-name">{assignee.name}</span>
                    <span className="dashboard-assignee-email">{assignee.email}</span>
                  </div>
                  <span className="dashboard-assignee-count mono">{assignee.count}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
