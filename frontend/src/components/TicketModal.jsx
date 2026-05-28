import React, { useState } from 'react';
import { updateTicketStatus, addTicketComment, updateTicket } from '../services/api';
import './TicketModal.css';

const TicketModal = ({ ticket, onClose, onUpdate }) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(ticket.comments || []);

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addTicketComment(ticket.id, newComment);
      setNewComment('');
      setComments([...comments, { text: newComment, author: 'Me', date: new Date() }]);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#e74c3c',
      high: '#e67e22',
      medium: '#f39c12',
      low: '#27ae60',
    };
    return colors[priority] || '#95a5a6';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>Ticket #{ticket.id}</h2>
            <p className="modal-subject">{ticket.subject}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="modal-main-content">
            {/* Description */}
            <div className="section">
              <h3>Descripción</h3>
              <p className="description-text">{ticket.description}</p>
            </div>

            {/* Details */}
            <div className="section">
              <h3>Detalles</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Persona Atendida:</span>
                  <span className="detail-value">{ticket.attendedPerson || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Área:</span>
                  <span className="detail-value">{ticket.area || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha de Creación:</span>
                  <span className="detail-value">{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Urgencia:</span>
                  <span className="detail-value" style={{ color: getPriorityColor(ticket.priority) }}>
                    {ticket.priority?.toUpperCase()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Dificultad:</span>
                  <span className="detail-value">{ticket.difficulty || 'Media'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estado:</span>
                  <span className="detail-value">{ticket.status?.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="section">
              <h3>Cambiar Estado</h3>
              <div className="status-buttons">
                {['open', 'in_progress', 'on_hold', 'closed'].map((status) => (
                  <button
                    key={status}
                    className={`status-btn ${ticket.status === status ? 'active' : ''}`}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdatingStatus || ticket.status === status}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="section">
              <h3>Comentarios ({comments.length})</h3>
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="no-comments">Sin comentarios aún</p>
                ) : (
                  comments.map((comment, index) => (
                    <div key={index} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{comment.author || 'Usuario'}</span>
                        <span className="comment-date">{formatDate(comment.date)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="add-comment">
                <textarea
                  placeholder="Agregar un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="comment-input"
                />
                <button
                  onClick={handleAddComment}
                  className="comment-btn"
                  disabled={!newComment.trim()}
                >
                  Comentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;