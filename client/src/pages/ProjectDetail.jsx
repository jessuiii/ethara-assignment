import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import MemberModal from '../components/MemberModal';
import * as api from '../services/api';
import './ProjectDetail.css';

const COLUMNS = [
  { id: 'todo', label: 'To Do', statusClass: 'pill-status-todo' },
  { id: 'in_progress', label: 'In Progress', statusClass: 'pill-status-progress' },
  { id: 'done', label: 'Done', statusClass: 'pill-status-done' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* Modals */
  const [taskModal, setTaskModal] = useState(null); // null = closed, {} = new, {task} = edit
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  /* Drag state */
  const [dragOverCol, setDragOverCol] = useState(null);

  /* Settings form */
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const [projData, tasksData] = await Promise.all([
        api.getProject(id),
        api.getTasks(id),
      ]);
      const p = projData.project || projData;
      setProject(p);
      setEditName(p.name || '');
      setEditDesc(p.description || '');
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  /* ── Helpers ── */
  const isAdmin = project?.currentUserRole === 'admin' ||
    project?.projectMembers?.some(
      (m) => (m.user?.id || m.user_id) === user?.id && m.role === 'admin'
    );

  /* Build a flat list of members for task assignee selection */
  const membersList = (project?.projectMembers || project?.members || []).map((m) => ({
    id: m.user?.id || m.user_id || m.id,
    name: m.user?.name || m.name || 'Unknown',
    email: m.user?.email || m.email || '',
    role: m.role,
  }));

  const getColumnTasks = (status) => tasks.filter((t) => t.status === status);

  /* ── Task CRUD ── */
  const handleSaveTask = async (formData) => {
    if (taskModal?.id) {
      // Update
      const data = await api.updateTask(id, taskModal.id, formData);
      const updated = data.task || data;
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create
      const data = await api.createTask(id, formData);
      const created = data.task || data;
      setTasks((prev) => [...prev, created]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    await api.deleteTask(id, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  /* ── Drag & Drop ── */
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.updateTask(id, taskId, { status: newStatus });
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  };

  /* ── Members ── */
  const handleAddMember = async (email) => {
    await api.addMember(id, { email });
    // Reload project to get updated member list
    const projData = await api.getProject(id);
    const p = projData.project || projData;
    setProject(p);
  };

  const handleSearchMemberSuggestions = async (query) => {
    const data = await api.searchProjectMemberSuggestions(id, query);
    return data.users || [];
  };

  const handleRemoveMember = async (userId) => {
    await api.removeMember(id, userId);
    // Reload project to get updated member list
    const projData = await api.getProject(id);
    const p = projData.project || projData;
    setProject(p);
  };

  /* ── Settings ── */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const data = await api.updateProject(id, { name: editName, description: editDesc });
      const p = data.project || data;
      setProject((prev) => ({ ...prev, ...p }));
      setShowSettings(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading project...</span>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="project-detail">
      {/* Header */}
      <div className="project-detail-header">
        <div className="project-detail-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Projects
          </button>
          <h1>{project?.name}</h1>
          {project?.description && <p className="project-detail-desc">{project.description}</p>}
        </div>
        <div className="project-detail-header-right">
          {/* Member avatars */}
          <div className="project-detail-members" onClick={() => isAdmin && setShowMembers(true)} style={{ cursor: isAdmin ? 'pointer' : 'default' }} title={isAdmin ? 'Manage members' : 'Team members'}>
            {membersList.slice(0, 4).map((m) => (
              <span key={m.id} className="avatar avatar-sm project-detail-member-avatar" style={{ background: getAvatarColor(m.name) }}>
                {m.name?.charAt(0)}
              </span>
            ))}
            {membersList.length > 4 && (
              <span className="project-detail-member-more">+{membersList.length - 4}</span>
            )}
          </div>

          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMembers(true)} title="Manage members">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" />
                </svg>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)} title="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '0 var(--space-6) var(--space-4)' }}>{error}</div>}

      {/* Kanban Board */}
      <div className="kanban">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className={`kanban-column ${dragOverCol === col.id ? 'kanban-column--dragover' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className={`pill ${col.statusClass}`}>{col.label}</span>
                  <span className="kanban-column-count mono">{colTasks.length}</span>
                </div>
                {isAdmin && (
                  <button
                    className="kanban-add-btn"
                    onClick={() => setTaskModal({ status: col.id })}
                    title={`Add task to ${col.label}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="kanban-column-body">
                {colTasks.length === 0 && (
                  <div className="kanban-empty">
                    <p>No tasks</p>
                  </div>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={(t) => setTaskModal(t)}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB for adding task (admin only) */}
      {isAdmin && (
        <button className="fab" onClick={() => setTaskModal({})} title="Add task">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Task Modal */}
      {taskModal !== null && (
        <TaskModal
          task={taskModal.id ? taskModal : { status: taskModal.status || 'todo' }}
          members={membersList}
          isAdmin={isAdmin}
          onSave={handleSaveTask}
          onDelete={taskModal.id && isAdmin ? handleDeleteTask : null}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Members Modal */}
      {showMembers && (
        <MemberModal
          members={project?.projectMembers || project?.members || []}
          onAdd={handleAddMember}
          onSearch={handleSearchMemberSuggestions}
          onRemove={handleRemoveMember}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project Settings</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="settings-name">Name</label>
                  <input id="settings-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-desc">Description</label>
                  <textarea id="settings-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteProject} style={{ marginRight: 'auto' }}>
                  Delete Project
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
                  {settingsSaving && <span className="spinner" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Shared utility for avatar colors */
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
