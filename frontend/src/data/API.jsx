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