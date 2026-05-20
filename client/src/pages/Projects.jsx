import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import './Projects.css';

const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#7c3aed', '#059669',
  '#d97706', '#dc2626', '#2563eb', '#db2777',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* New project modal */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    setLoading(true);
    api
      .getProjects()
      .then((data) => setProjects(Array.isArray(data) ? data : data.projects || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Project name is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await api.createProject({ name: newName.trim(), description: newDesc.trim() });
      const project = data.project || data;
      setProjects((prev) => [...prev, project]);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="page projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start organising tasks with your team.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="project-card card card-hoverable">
              <div className="project-card-header">
                <div className="project-card-icon" style={{ background: getAvatarColor(project.name) }}>
                  {project.name?.charAt(0)}
                </div>
                <div className="project-card-title">
                  <h3>{project.name}</h3>
                  {project.description && (
                    <p className="project-card-desc">{project.description}</p>
                  )}
                </div>
              </div>
              <div className="project-card-meta">
                <span className="project-card-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {project.projectMembers?.length || project.members?.length || 0} members
                </span>
                <span className="project-card-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  {project.tasks?.length || project.taskCount || 0} tasks
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Project</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{createError}</div>}
                <div className="form-group">
                  <label htmlFor="proj-name">Project Name</label>
                  <input
                    id="proj-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Website Redesign"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="proj-desc">Description</label>
                  <textarea
                    id="proj-desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What is this project about?"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating && <span className="spinner" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
