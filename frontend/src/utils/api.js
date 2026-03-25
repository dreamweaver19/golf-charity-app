import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Auth
  login: (email, password) => axios.post(`${API_BASE}/auth/login`, { email, password }),
  register: (userData) => axios.post(`${API_BASE}/auth/register`, userData),
  getMe: () => axios.get(`${API_BASE}/auth/me`, { headers: getAuthHeader() }),

  // Subscriptions
  createCheckout: (packageId) => 
    axios.post(`${API_BASE}/subscriptions/create-checkout`, 
      { package_id: packageId, origin_url: window.location.origin },
      { headers: getAuthHeader() }
    ),
  getCheckoutStatus: (sessionId) => 
    axios.get(`${API_BASE}/subscriptions/checkout-status/${sessionId}`, { headers: getAuthHeader() }),
  getMySubscription: () => 
    axios.get(`${API_BASE}/subscriptions/my-subscription`, { headers: getAuthHeader() }),

  // Scores
  createScore: (scoreData) => 
    axios.post(`${API_BASE}/scores`, scoreData, { headers: getAuthHeader() }),
  getMyScores: () => 
    axios.get(`${API_BASE}/scores/my-scores`, { headers: getAuthHeader() }),
  deleteScore: (scoreId) => 
    axios.delete(`${API_BASE}/scores/${scoreId}`, { headers: getAuthHeader() }),

  // Charities
  getCharities: () => axios.get(`${API_BASE}/charities`),
  getCharity: (id) => axios.get(`${API_BASE}/charities/${id}`),
  createCharity: (data) => 
    axios.post(`${API_BASE}/charities`, data, { headers: getAuthHeader() }),
  updateCharity: (id, data) => 
    axios.put(`${API_BASE}/charities/${id}`, data, { headers: getAuthHeader() }),
  deleteCharity: (id) => 
    axios.delete(`${API_BASE}/charities/${id}`, { headers: getAuthHeader() }),
  updateCharitySelection: (charityId, contributionPercent) => 
    axios.put(`${API_BASE}/users/charity-selection`, 
      null, 
      { 
        params: { charity_id: charityId, contribution_percent: contributionPercent },
        headers: getAuthHeader() 
      }
    ),

  // Draws
  getDraws: () => axios.get(`${API_BASE}/draws`),
  getDraw: (id) => axios.get(`${API_BASE}/draws/${id}`),
  createDraw: (data) => 
    axios.post(`${API_BASE}/draws`, data, { headers: getAuthHeader() }),
  simulateDraw: (id) => 
    axios.post(`${API_BASE}/draws/${id}/simulate`, {}, { headers: getAuthHeader() }),
  publishDraw: (id) => 
    axios.post(`${API_BASE}/draws/${id}/publish`, {}, { headers: getAuthHeader() }),

  // Admin
  getAllUsers: () => 
    axios.get(`${API_BASE}/admin/users`, { headers: getAuthHeader() }),
  getAnalytics: () => 
    axios.get(`${API_BASE}/admin/analytics`, { headers: getAuthHeader() }),
};