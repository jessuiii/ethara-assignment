import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/* Simple inline SVG icons */
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  projects: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  moon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a7.5 7.5 0 1 0 9 9A9 9 0 1 1 12 3z" />
    </svg>
  ),
  sun: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
};

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

export default function Navbar({ theme, onToggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.name?.charAt(0) || 'U';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Left side — brand */}
        <div className="navbar-brand">
          <div className="navbar-logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="var(--font-heading)">E</text>
            </svg>
          </div>
          <span className="navbar-name">Ethara</span>
        </div>

        {/* Center — nav links */}
        <div className="navbar-links">
          <NavLink to="/dashboard" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            {Icons.dashboard}
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            {Icons.projects}
            <span>Projects</span>
          </NavLink>
        </div>

        {/* Right side — user */}
        <div className="navbar-user">
          <button
            className="navbar-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? Icons.sun : Icons.moon}
          </button>
          <div className="navbar-avatar" style={{ background: getAvatarColor(user?.name) }}>
            {initial}
          </div>
          <span className="navbar-username">{user?.name}</span>
          <button className="navbar-logout" onClick={handleLogout} title="Log out">
            {Icons.logout}
          </button>
        </div>
      </div>
    </nav>
  );
}
