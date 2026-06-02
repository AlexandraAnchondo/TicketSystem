import React from 'react';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import '../styles/TicketCard.css';

const priorityMeta = {
  critical: { label: 'Crítica', color: '#dc2626', bg: '#fef2f2' },
  high: { label: 'Alta', color: '#ea580c', bg: '#fff7ed' },
  medium: { label: 'Media', color: '#ca8a04', bg: '#fefce8' },
  low: { label: 'Baja', color: '#16a34a', bg: '#f0fdf4' },
};

const statusMeta = {
  open: { label: 'Abierto', color: 'warning' },
  in_progress: { label: 'En progreso', color: 'info' },
  closed: { label: 'Cerrado', color: 'success' },
  on_hold: { label: 'En espera', color: 'default' },
};

const formatDate = (dateString) => {
  if (!dateString) return 'Sin fecha';

  return new Date(dateString).toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TicketCard = ({ ticket, onClick }) => {
  const priority = priorityMeta[ticket.priority] || {
    label: ticket.priority || 'Sin urgencia',
    color: '#64748b',
    bg: '#f8fafc',
  };

  const status = statusMeta[ticket.status] || {
    label: ticket.status || 'Sin estado',
    color: 'default',
  };

  return (
    <Card
      className="ticket-card"
      elevation={0}
      sx={{
          '--priority-color': priority.color, 
          '--priority-bg': priority.bg, 
          transition: "0.25s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 6
          } 
        }}
    >
      <CardActionArea onClick={onClick} className="ticket-action">
        <Box className="ticket-priority-strip" />

        <CardContent className="ticket-content">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Chip
              size="small"
              icon={<PriorityHighRoundedIcon />}
              label={priority.label}
              className="priority-chip"
            />
            <Chip
              size="small"
              label={status.label}
              color={status.color}
              variant={ticket.status === 'closed' ? 'filled' : 'outlined'}
              className="status-chip"
            />
          </Stack>

          <Typography variant="caption" className="ticket-id">
            Ticket #{ticket.id}
          </Typography>

          <Tooltip title={ticket.subject || ''} placement="top">
            <Typography variant="h6" className="ticket-subject">
              {ticket.subject || 'Sin asunto'}
            </Typography>
          </Tooltip>

          <Typography variant="body2" color="text.secondary" className="ticket-description">
            {ticket.description || 'Sin descripción capturada.'}
          </Typography>

          <Stack className="ticket-meta" spacing={1.2}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar className="meta-avatar">
                <PersonRoundedIcon fontSize="small" />
              </Avatar>
              <Box minWidth={0}>
                <Typography variant="caption" color="text.secondary">
                  Persona atendida
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {ticket.attendedPerson || 'N/A'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar className="meta-avatar">
                <ApartmentRoundedIcon fontSize="small" />
              </Avatar>
              <Box minWidth={0}>
                <Typography variant="caption" color="text.secondary">
                  Área
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {ticket.area || 'N/A'}
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={0.8} color="text.secondary">
              <CalendarMonthRoundedIcon fontSize="small" />
              <Typography variant="caption" fontWeight={700}>
                {formatDate(ticket.createdAt)}
              </Typography>
            </Stack>

            <Typography variant="caption" className="see-detail">
              Ver detalle
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default TicketCard;
