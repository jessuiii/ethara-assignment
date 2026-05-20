import { useState, useEffect } from 'react';
import './TaskModal.css';

export default function TaskModal({ task, members, isAdmin, onSave, onDelete, onClose }) {
  const isEditing = !!task?.id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigned_to: '',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        assigned_to: task.assigned_to || task.assignee?.id || '',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      });
    }
  }, [task]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    // Members can only update status
    if (isEditing && !isAdmin) {
      setSaving(true);
      try {
        await onSave({ status: form.status });
        onClose();
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

            <div className="form-group">
              <label htmlFor="task-title">Title</label>
              <input
                id="task-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="What needs to be done?"
                autoFocus
                disabled={isEditing && !isAdmin}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Add details..."
                rows={3}
                disabled={isEditing && !isAdmin}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-priority">Priority</label>
                <select id="task-priority" name="priority" value={form.priority} onChange={handleChange} disabled={isEditing && !isAdmin}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="task-status">Status</label>
                <select id="task-status" name="status" value={form.status} onChange={handleChange}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-assignee">Assignee</label>
                <select id="task-assignee" name="assigned_to" value={form.assigned_to} onChange={handleChange} disabled={isEditing && !isAdmin}>
                  <option value="">Unassigned</option>
                  {(members || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="task-due">Due Date</label>
                <input id="task-due" name="due_date" type="date" value={form.due_date} onChange={handleChange} disabled={isEditing && !isAdmin} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving} style={{ marginRight: 'auto' }}>
                Delete
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="spinner" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
