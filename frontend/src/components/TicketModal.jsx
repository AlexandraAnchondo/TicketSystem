import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CommentRoundedIcon from '@mui/icons-material/CommentRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';

import { updateTicketStatus, addTicketComment } from '../services/api';
import './TicketModal.css';

const priorityMeta = {
  critical: { label: 'Crítica', color: '#dc2626' },
  high: { label: 'Alta', color: '#ea580c' },
  medium: { label: 'Media', color: '#ca8a04' },
  low: { label: 'Baja', color: '#16a34a' },
};

const statusOptions = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'on_hold', label: 'En espera' },
  { value: 'closed', label: 'Cerrado' },
];

const statusLabels = statusOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const formatDate = (dateString) => {
  if (!dateString) return 'Sin fecha';

  return new Date(dateString).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DetailItem = ({ icon, label, value, color }) => (
  <Paper className="detail-item" elevation={0}>
    <Avatar className="detail-icon" sx={{ color }}>
      {icon}
    </Avatar>
    <Box minWidth={0}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={800} noWrap sx={{ color }}>
        {value}
      </Typography>
    </Box>
  </Paper>
);

const TicketModal = ({ open, ticket, onClose, onUpdate }) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    setComments(ticket?.comments || []);
    setNewComment('');
  }, [ticket]);

  if (!ticket) return null;

  const priority = priorityMeta[ticket.priority] || {
    label: ticket.priority || 'Sin urgencia',
    color: '#64748b',
  };

  const handleStatusChange = async (_, newStatus) => {
    if (!newStatus || newStatus === ticket.status) return;

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

    setIsAddingComment(true);
    try {
      await addTicketComment(ticket.id, newComment);
      setComments((prev) => [
        ...prev,
        { text: newComment.trim(), author: 'Me', date: new Date() },
      ]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{ className: 'ticket-modal-paper' }}
    >
      <DialogTitle className="ticket-modal-header">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
              <Chip label={`Ticket #${ticket.id}`} color="primary" size="small" />
              <Chip
                label={priority.label}
                size="small"
                sx={{
                  color: priority.color,
                  borderColor: priority.color,
                  fontWeight: 800,
                }}
                variant="outlined"
              />
              <Chip
                label={statusLabels[ticket.status] || ticket.status || 'Sin estado'}
                size="small"
                color={ticket.status === 'closed' ? 'success' : 'default'}
              />
            </Stack>

            <Typography variant="h5" fontWeight={900}>
              {ticket.subject || 'Sin asunto'}
            </Typography>
          </Box>

          <IconButton onClick={onClose} className="modal-close-button">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers className="ticket-modal-content">
        <Stack spacing={3}>
          <Paper className="modal-section description-section" elevation={0}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <DescriptionRoundedIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={900}>
                Descripción
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" className="description-text">
              {ticket.description || 'Sin descripción capturada.'}
            </Typography>
          </Paper>

          <Paper className="modal-section" elevation={0}>
            <Typography variant="subtitle1" fontWeight={900} mb={2}>
              Detalles del ticket
            </Typography>

            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<PersonRoundedIcon />}
                  label="Persona atendida"
                  value={ticket.attendedPerson || 'N/A'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<ApartmentRoundedIcon />}
                  label="Área"
                  value={ticket.area || 'N/A'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<CalendarMonthRoundedIcon />}
                  label="Fecha de creación"
                  value={formatDate(ticket.createdAt)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<FlagRoundedIcon />}
                  label="Urgencia"
                  value={priority.label}
                  color={priority.color}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<SpeedRoundedIcon />}
                  label="Dificultad"
                  value={ticket.difficulty || 'Media'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<TaskAltRoundedIcon />}
                  label="Estado actual"
                  value={statusLabels[ticket.status] || ticket.status || 'Sin estado'}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper className="modal-section" elevation={0}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={1.5}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={900}>
                  Cambiar estado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actualiza el avance del ticket.
                </Typography>
              </Box>

              {isUpdatingStatus && <CircularProgress size={24} />}
            </Stack>

            <ToggleButtonGroup
              exclusive
              fullWidth
              value={ticket.status}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
              className="status-toggle-group"
            >
              {statusOptions.map((status) => (
                <ToggleButton key={status.value} value={status.value}>
                  {status.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Paper>

          <Paper className="modal-section" elevation={0}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <CommentRoundedIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={900}>
                Comentarios ({comments.length})
              </Typography>
            </Stack>

            <Stack spacing={1.5} className="comments-list">
              {comments.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Sin comentarios aún.
                </Alert>
              ) : (
                comments.map((comment, index) => (
                  <Paper key={`${comment.date}-${index}`} className="comment-item" elevation={0}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography variant="body2" fontWeight={900}>
                        {comment.author || 'Usuario'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(comment.date)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.8}>
                      {comment.text}
                    </Typography>
                  </Paper>
                ))
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                label="Agregar comentario"
                placeholder="Escribe el seguimiento realizado..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />

              <Button
                variant="contained"
                endIcon={isAddingComment ? <CircularProgress color="inherit" size={16} /> : <SendRoundedIcon />}
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
                sx={{ borderRadius: 3, px: 3, fontWeight: 800, textTransform: 'none' }}
              >
                Comentar
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions className="ticket-modal-actions">
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketModal;
