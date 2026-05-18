const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token && options.auth !== false) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'API Error');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), auth: false }),

  // Restaurants
  getRestaurants: () => apiCall('/restaurants', { auth: false }),
  getRestaurant: (slug) => apiCall(`/restaurants/${slug}`, { auth: false }),

  // Menu
  getCategories: () => apiCall('/categories', { auth: false }),
  getMenu: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/menu${query ? `?${query}` : ''}`, { auth: false });
  },
  getMenuItem: (id) => apiCall(`/menu/${id}`, { auth: false }),
  createMenuItem: (data) => apiCall('/menu', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id, data) => apiCall(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem: (id) => apiCall(`/menu/${id}`, { method: 'DELETE' }),

  // Homepage Content
  getFeaturedDishes: () => apiCall('/featured-dishes', { auth: false }),
  updateFeaturedDishes: (itemKeys) => apiCall('/admin/featured-dishes', { method: 'PUT', body: JSON.stringify({ itemKeys }) }),
  getTestimonials: () => apiCall('/testimonials', { auth: false }),
  getAdminTestimonials: () => apiCall('/admin/testimonials'),
  createTestimonial: (data) => apiCall('/admin/testimonials', { method: 'POST', body: JSON.stringify(data) }),
  updateTestimonial: (id, data) => apiCall(`/admin/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTestimonial: (id) => apiCall(`/admin/testimonials/${id}`, { method: 'DELETE' }),
  getNotificationEmails: () => apiCall('/admin/notification-emails'),
  updateNotificationEmails: (data) => apiCall('/admin/notification-emails', { method: 'PUT', body: JSON.stringify(data) }),

  // Reservations
  getReservations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reservations${query ? `?${query}` : ''}`);
  },
  createReservation: (data) => apiCall('/reservations', { method: 'POST', body: JSON.stringify(data), auth: false }),
  findManageReservations: (email, phone) => apiCall('/reservations/manage', { method: 'POST', body: JSON.stringify({ email, phone }), auth: false }),
  updateManagedReservation: (id, data) => apiCall(`/reservations/manage/${id}`, { method: 'PUT', body: JSON.stringify(data), auth: false }),
  updateReservation: (id, data) => apiCall(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReservation: (id) => apiCall(`/reservations/${id}`, { method: 'DELETE' }),

  // Catering
  submitCatering: (data) => apiCall('/catering', { method: 'POST', body: JSON.stringify(data), auth: false }),
  getCateringRequests: () => apiCall('/catering'),
  updateCateringRequest: (id, data) => apiCall(`/catering/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCateringRequest: (id) => apiCall(`/catering/${id}`, { method: 'DELETE' }),

  // Contact
  submitContact: (data) => apiCall('/contact', { method: 'POST', body: JSON.stringify(data), auth: false }),
  getContactInquiries: () => apiCall('/contact'),
  updateContactInquiry: (id, data) => apiCall(`/contact/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContactInquiry: (id) => apiCall(`/contact/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: () => apiCall('/analytics/overview'),

  // Reservation Settings (Tuesday toggle)
  getReservationSettings: () => apiCall('/reservation-settings', { auth: false }),
  updateReservationSettings: (data) => apiCall('/admin/reservation-settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export default api;
