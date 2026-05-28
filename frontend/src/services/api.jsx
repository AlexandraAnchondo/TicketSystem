import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== TICKETS API ====================

/**
 * Obtener todos los tickets con filtros opcionales
 * @param {Object} filters - Filtros disponibles:
 *   - startDate: string (YYYY-MM-DD)
 *   - endDate: string (YYYY-MM-DD)
 *   - priority: string (low, medium, high, critical)
 *   - status: string (open, in_progress, closed, on_hold)
 *   - assignedTo: string (user ID)
 *   - search: string (búsqueda en asunto o descripción)
 *   - page: number (página, default 1)
 *   - limit: number (tickets por página, default 10)
 */
export const getTickets = async (filters = {}) => {
  try {
    const response = await apiClient.get('/tickets', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
};

/**
 * Obtener un ticket específico por ID
 */
export const getTicketById = async (ticketId) => {
  try {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
};

/**
 * Crear un nuevo ticket
 */
export const createTicket = async (ticketData) => {
  try {
    const response = await apiClient.post('/tickets', ticketData);
    return response.data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Actualizar un ticket existente
 */
export const updateTicket = async (ticketId, ticketData) => {
  try {
    const response = await apiClient.put(`/tickets/${ticketId}`, ticketData);
    return response.data;
  } catch (error) {
    console.error('Error updating ticket:', error);
    throw error;
  }
};

/**
 * Eliminar un ticket
 */
export const deleteTicket = async (ticketId) => {
  try {
    const response = await apiClient.delete(`/tickets/${ticketId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};

/**
 * Obtener tickets agrupados por día
 */
export const getTicketsByDay = async (date) => {
  try {
    const response = await apiClient.get(`/tickets/grouped/by-day?date=${date}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets by day:', error);
    throw error;
  }
};

/**
 * Obtener tickets agrupados por hora
 */
export const getTicketsByHour = async (date) => {
  try {
    const response = await apiClient.get(`/tickets/grouped/by-hour?date=${date}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets by hour:', error);
    throw error;
  }
};

/**
 * Obtener tickets de la última semana
 */
export const getWeekTickets = async (startDate, endDate) => {
  try {
    const response = await apiClient.get('/tickets/grouped/by-week', {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching week tickets:', error);
    throw error;
  }
};

/**
 * Obtener tickets del mes
 */
export const getMonthTickets = async (year, month) => {
  try {
    const response = await apiClient.get(`/tickets/grouped/by-month?year=${year}&month=${month}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching month tickets:', error);
    throw error;
  }
};

/**
 * Cambiar estado de un ticket
 */
export const updateTicketStatus = async (ticketId, status) => {
  try {
    const response = await apiClient.patch(`/tickets/${ticketId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

/**
 * Asignar ticket a un usuario
 */
export const assignTicket = async (ticketId, userId) => {
  try {
    const response = await apiClient.patch(`/tickets/${ticketId}/assign`, { userId });
    return response.data;
  } catch (error) {
    console.error('Error assigning ticket:', error);
    throw error;
  }
};

/**
 * Agregar comentario a un ticket
 */
export const addTicketComment = async (ticketId, comment) => {
  try {
    const response = await apiClient.post(`/tickets/${ticketId}/comments`, { comment });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de tickets
 */
export const getTicketStats = async (filters = {}) => {
  try {
    const response = await apiClient.get('/tickets/stats', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    throw error;
  }
};

// ==================== AREAS API ====================

/**
 * Obtener todas las áreas
 */
export const getAreas = async () => {
  try {
    const response = await apiClient.get('/areas');
    return response.data;
  } catch (error) {
    console.error('Error fetching areas:', error);
    throw error;
  }
};

// ==================== USERS API ====================

/**
 * Obtener todos los usuarios/ingenieros
 */
export const getUsers = async () => {
  try {
    const response = await apiClient.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export default apiClient;