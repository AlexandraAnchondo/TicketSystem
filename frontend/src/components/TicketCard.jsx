import React from 'react';
import './TicketCard.css';

const TicketCard = ({ ticket, onClick }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#e74c3c',
      high: '#e67e22',
      medium: '#f39c12',
      low: '#27ae60',
    };
    return colors[priority] || '#95a5a6';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      open: 'status-open',
      in_progress: 'status-in-progress',
      closed: 'status-closed',
      on_hold: 'status-on-hold',
    };
    return classes[status] || 'status-default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      closed: 'Cerrado',
      on_hold: 'En Espera',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="ticket-card"
      onClick={onClick}
      style={{
        borderLeftColor: getPriorityColor(ticket.priority),
      }}
    >
      {/* Priority Badge */}
      <div className="priority-badge" style={{ backgroundColor: getPriorityColor(ticket.priority) }}>
        <span className="priority-dot"></span>
        <span className="priority-text">{ticket.priority?.toUpperCase()}</span>
      </div>

      {/* Card Content */}
      <div className="ticket-content">
        {/* Ticket ID */}
        <div className="ticket-id">
          <span className="id-text">#{ticket.id}</span>
        </div>

        {/* Subject */}
        <h3 className="ticket-subject">{ticket.subject}</h3>

        {/* Person & Area */}
        <div className="ticket-meta">
          <div className="meta-item">
            <span className="meta-label">Persona:</span>
            <span className="meta-value">{ticket.attendedPerson || 'N/A'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Área:</span>
            <span className="meta-value">{ticket.area || 'N/A'}</span>
          </div>
        </div>

        {/* Description Preview */}
        {ticket.description && (
          <p className="ticket-description">{ticket.description.substring(0, 80)}...</p>
        )}

        {/* Footer */}
        <div className="ticket-footer">
          <div className="ticket-datetime">
            <span className="datetime-icon">📅</span>
            <span className="datetime-text">{formatDate(ticket.createdAt)}</span>
          </div>
          <div className={`status-badge ${getStatusBadgeClass(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;