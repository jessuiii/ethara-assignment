import { useEffect, useState } from 'react';
import './MemberModal.css';

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

export default function MemberModal({ members, onAdd, onSearch, onRemove, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = email.trim();
    if (!term || !onSearch) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const users = await onSearch(term);
        if (active) setSuggestions(Array.isArray(users) ? users : []);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [email, onSearch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      if (suggestions.length > 0) {
        setAdding(true);
        setError('');
        try {
          await onAdd(suggestions[0].email);
          setEmail('');
          setSuggestions([]);
        } catch (err) {
          setError(err.message);
        } finally {
          setAdding(false);
        }
        return;
      }
      setError('Please enter a valid email address');
      return;
    }

    setAdding(true);
    setError('');
    try {
      await onAdd(email.trim());
      setEmail('');
      setSuggestions([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handlePickSuggestion = async (suggestedUser) => {
    setAdding(true);
    setError('');
    try {
      await onAdd(suggestedUser.email);
      setEmail('');
      setSuggestions([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await onRemove(userId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Members</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Add member form */}
          <form className="member-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Type name or email..."
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
              {adding ? <span className="spinner" /> : 'Add'}
            </button>
          </form>

          {(searching || suggestions.length > 0) && (
            <div className="member-suggestions">
              {searching && <p className="member-suggestion-hint">Searching...</p>}
              {!searching && suggestions.length === 0 && email.trim() && (
                <p className="member-suggestion-hint">No matching users</p>
              )}
              {suggestions.map((suggestedUser) => (
                <button
                  key={suggestedUser.id}
                  type="button"
                  className="member-suggestion-item"
                  onClick={() => handlePickSuggestion(suggestedUser)}
                >
                  <span className="avatar avatar-sm" style={{ background: getAvatarColor(suggestedUser.name) }}>
                    {suggestedUser.name?.charAt(0)}
                  </span>
                  <span className="member-suggestion-meta">
                    <span className="member-suggestion-name">{suggestedUser.name}</span>
                    <span className="member-suggestion-email">{suggestedUser.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>{error}</div>}

          {/* Member list */}
          <div className="member-list">
            {(members || []).length === 0 && (
              <p className="member-empty">No members yet.</p>
            )}
            {(members || []).map((member) => {
              const name = member.user?.name || member.name || 'Unknown';
              const memberEmail = member.user?.email || member.email || '';
              const userId = member.user?.id || member.user_id || member.id;
              const role = member.role || 'member';

              return (
                <div key={userId} className="member-item">
                  <div className="member-info">
                    <span className="avatar avatar-md" style={{ background: getAvatarColor(name) }}>
                      {name.charAt(0)}
                    </span>
                    <div className="member-details">
                      <span className="member-name">{name}</span>
                      <span className="member-email">{memberEmail}</span>
                    </div>
                  </div>
                  <div className="member-actions">
                    <span className={`pill ${role === 'admin' ? 'pill-role' : 'pill-status-todo'}`}>
                      {role}
                    </span>
                    {role !== 'admin' && (
                      <button className="btn btn-ghost btn-sm member-remove" onClick={() => handleRemove(userId)} title="Remove member">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
