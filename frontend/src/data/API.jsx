import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL_DEV;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Obtener token y headers
const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Manejo de errores comunes
const handleApiError = (err) => {
    console.error(err);
    if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.setItem("isLoggedIn", "false");
        window.location.href = "/tickets/login";
    }
    throw err;
};

// --- Funciones exportadas ---
export const login = async (usuario, contraseña) => {
    try {
        const response = await api.post("/login", { usuario, contraseña });
        return response.data;
    } catch (err) {
        throw err.response?.data || { error: "Error de red" };
    }
};

export const cambiarPassword = async (userId, nueva) => {
    try {
        const response = await api.post(
            "/cambiar_password",
            { userId, nueva },
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

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
        const response = await api.get('/tickets', { params: filters, headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener un ticket específico por ID
 */
export const getTicketById = async (ticketId) => {
    try {
        const response = await api.get(`/tickets/${ticketId}`, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Crear un nuevo ticket
 */
export const createTicket = async (ticketData) => {
    try {
        const author = localStorage.getItem("usuario");
        const response = await api.post('/tickets', { ...ticketData, author }, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Actualizar un ticket existente
 */
export const updateTicket = async (ticketId, ticketData) => {
    try {
        const author = localStorage.getItem("usuario");
        const response = await api.put(`/tickets/${ticketId}`, { ...ticketData, author }, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Eliminar un ticket
 */
export const deleteTicket = async (ticketId) => {
    try {
        const response = await api.delete(`/tickets/${ticketId}`, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Cambiar estado de un ticket
 */
export const updateTicketStatus = async (ticketId, status) => {
    try {
        const author = localStorage.getItem("usuario");
        const response = await api.patch(`/tickets/${ticketId}/status`, { status, author }, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Asignar ticket a un usuario
 */
export const assignTicket = async (ticketId, userId) => {
    try {
        const author = localStorage.getItem("usuario");
        const response = await api.patch(`/tickets/${ticketId}/assign`, { userId, author }, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Agregar comentario a un ticket
 */
export const addTicketComment = async (ticketId, comment) => {
    try {
        const author = localStorage.getItem("usuario");
        const response = await api.post(`/tickets/${ticketId}/comments`, { comment, author }, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener estadísticas de tickets
 */
export const getTicketStats = async (filters = {}) => {
    try {
        const response = await api.get('/tickets/stats', { params: filters, headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener tickets agrupados por día
 */
export const getTicketsByDay = async (date) => {
    try {
        const response = await api.get(`/tickets/grouped/by-day?date=${date}`, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener tickets agrupados por hora
 */
export const getTicketsByHour = async (date) => {
    try {
        const response = await api.get(`/tickets/grouped/by-hour?date=${date}`, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener tickets de la última semana
 */
export const getWeekTickets = async (startDate, endDate) => {
    try {
        const response = await api.get('/tickets/grouped/by-week', {
            params: { startDate, endDate },
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

/**
 * Obtener tickets del mes
 */
export const getMonthTickets = async (year, month) => {
    try {
        const response = await api.get(`/tickets/grouped/by-month?year=${year}&month=${month}`, { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

// ==================== AREAS API ====================

/**
 * Obtener todas las áreas
 */
export const getAreas = async () => {
    try {
        const response = await api.get('/areas', { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};

// ==================== USERS API ====================

/**
 * Obtener todos los usuarios
 */
export const getUsers = async () => {
    try {
        const response = await api.get('/users', { headers: getAuthHeaders() });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
};