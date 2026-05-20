const BASE_URL =
  import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api';

/* ── Helper ── */
async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

/* ── Auth ── */
export const signup = (body) =>
  request('/auth/signup', { method: 'POST', body: JSON.stringify(body) });

export const login = (body) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const getMe = () => request('/auth/me');

/* ── Dashboard ── */
export const getDashboard = () => request('/dashboard');

/* ── Projects ── */
export const getProjects = () => request('/projects');

export const createProject = (body) =>
  request('/projects', { method: 'POST', body: JSON.stringify(body) });

export const getProject = (id) => request(`/projects/${id}`);

export const updateProject = (id, body) =>
  request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const deleteProject = (id) =>
  request(`/projects/${id}`, { method: 'DELETE' });

/* ── Members ── */
export const addMember = (projectId, body) =>
  request(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const removeMember = (projectId, userId) =>
  request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });

export const searchProjectMemberSuggestions = (projectId, query) =>
  request(`/projects/${projectId}/member-suggestions?q=${encodeURIComponent(query)}`);

/* ── Tasks ── */
export const getTasks = (projectId) =>
  request(`/projects/${projectId}/tasks`);

export const createTask = (projectId, body) =>
  request(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateTask = (projectId, taskId, body) =>
  request(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteTask = (projectId, taskId) =>
  request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
