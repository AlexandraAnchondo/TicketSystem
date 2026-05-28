import React, { useState, useEffect, useMemo } from 'react';
import { getTickets, getTicketStats } from '../services/api';
import TicketCard from '../components/TicketCard';
import TicketModal from '../components/TicketModal';
import FilterBar from '../components/FilterBar';
import './DashboardPage.css';

const DashboardPage = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    timeRange: 'today', // today, week, month, all
    priority: null, // null, low, medium, high, critical
    status: null, // null, open, in_progress, closed, on_hold
    search: '',
    sortBy: 'date', // date, priority, status
  });

  const [stats, setStats] = useState(null);

  // Fetch tickets
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const params = {
        search: filters.search,
        page: 1,
        limit: 100,
      };

      // Agregar filtros de fecha
      if (filters.timeRange === 'today') {
        params.startDate = today.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      } else if (filters.timeRange === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        params.startDate = weekStart.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      } else if (filters.timeRange === 'month') {
        params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        params.endDate = today.toISOString().split('T')[0];
      }

      // Agregar filtros adicionales
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const data = await getTickets(params);
      setTickets(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError('Error al cargar los tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await getTicketStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filters.timeRange, filters.priority, filters.status, filters.search]);

  // Ordenar y filtrar tickets
  const sortedTickets = useMemo(() => {
    let result = [...tickets];

    if (filters.sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      result.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));
    } else if (filters.sortBy === 'date') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [tickets, filters.sortBy]);

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Sistema de Tickets - Soporte Técnico</h1>
            <p className="subtitle">Gestiona y registra las actividades de soporte</p>
          </div>
          {stats && (
            <div className="stats-overview">
              <div className="stat-card">
                <span className="stat-label">Total</span>
                <span className="stat-value">{stats.total || 0}</span>
              </div>
              <div className="stat-card open">
                <span className="stat-label">Abiertos</span>
                <span className="stat-value">{stats.open || 0}</span>
              </div>
              <div className="stat-card in-progress">
                <span className="stat-label">En Progreso</span>
                <span className="stat-value">{stats.inProgress || 0}</span>
              </div>
              <div className="stat-card closed">
                <span className="stat-label">Cerrados</span>
                <span className="stat-value">{stats.closed || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        {/* Tickets Grid */}
        <div className="tickets-section">
          {loading ? (
            <div className="loading">
              <p>Cargando tickets...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchTickets}>Reintentar</button>
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="empty-state">
              <p>No hay tickets que coincidan con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="tickets-grid">
              {sortedTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => handleTicketClick(ticket)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setShowModal(false)}
          onUpdate={() => {
            fetchTickets();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;