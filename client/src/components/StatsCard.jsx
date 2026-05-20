import './StatsCard.css';

const typeConfig = {
  total:    { bg: '#eef2ff', color: '#4f46e5', icon: '📋' },
  todo:     { bg: '#f1f5f9', color: '#475569', icon: '📝' },
  progress: { bg: '#eef2ff', color: '#4f46e5', icon: '⚡' },
  done:     { bg: '#ecfdf5', color: '#059669', icon: '✓'  },
  overdue:  { bg: '#fef2f2', color: '#dc2626', icon: '⏰' },
  projects: { bg: '#f5f3ff', color: '#7c3aed', icon: '📂' },
};

export default function StatsCard({ label, value, type = 'total' }) {
  const config = typeConfig[type] || typeConfig.total;

  return (
    <div className="stats-card">
      <div className="stats-card-icon" style={{ background: config.bg, color: config.color }}>
        {config.icon === '✓' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span>{config.icon}</span>
        )}
      </div>
      <div className="stats-card-body">
        <span className="stats-card-label">{label}</span>
        <span className="stats-card-value mono">{value ?? '—'}</span>
      </div>
    </div>
  );
}
