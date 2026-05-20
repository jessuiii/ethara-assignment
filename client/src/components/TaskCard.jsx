import './TaskCard.css';

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

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const priorityClass = {
  high: 'pill-priority-high',
  medium: 'pill-priority-medium',
  low: 'pill-priority-low',
};

export default function TaskCard({ task, onClick }) {
  const overdue = task.status !== 'done' && isOverdue(task.due_date);
  const assigneeName = task.assignee?.name;

  return (
    <div
      className={`task-card ${overdue ? 'task-card--overdue' : ''}`}
      onClick={() => onClick?.(task)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('task-card--dragging');
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove('task-card--dragging');
      }}
    >
      {/* Priority + title */}
      <div className="task-card-header">
        <span className={`pill ${priorityClass[task.priority] || 'pill-priority-medium'}`}>
          {task.priority}
        </span>
      </div>

      <h4 className="task-card-title">{task.title}</h4>

      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* Footer: assignee + due */}
      <div className="task-card-footer">
        {assigneeName ? (
          <div className="task-card-assignee">
            <span className="avatar avatar-sm" style={{ background: getAvatarColor(assigneeName) }}>
              {assigneeName.charAt(0)}
            </span>
            <span className="task-card-assignee-name">{assigneeName}</span>
          </div>
        ) : (
          <span className="task-card-unassigned">Unassigned</span>
        )}

        {task.due_date && (
          <span className={`task-card-due ${overdue ? 'task-card-due--overdue' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}
