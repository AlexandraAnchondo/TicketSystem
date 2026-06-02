import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import { getTickets, getTicketStats } from '../data/API';
import TicketCard from '../components/TicketCard';
import TicketModal from '../components/TicketModal';
import FilterBar from '../components/FilterBar';
import './DashboardPage.css';

const statConfig = [
  {
    key: 'total',
    label: 'Total',
    icon: ConfirmationNumberRoundedIcon,
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
  {
    key: 'open',
    label: 'Abiertos',
    icon: ErrorOutlineRoundedIcon,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
  },
  {
    key: 'inProgress',
    label: 'En progreso',
    icon: HourglassTopRoundedIcon,
    gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
  },
  {
    key: 'closed',
    label: 'Cerrados',
    icon: CheckCircleRoundedIcon,
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  },
];

const DashboardPage = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    timeRange: 'today',
    priority: null,
    status: null,
    search: '',
    sortBy: 'date',
  });

  const [stats, setStats] = useState(null);

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

      if (filters.timeRange === 'today') {
        params.startDate = today.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      }

      if (filters.timeRange === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        params.startDate = weekStart.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      }

      if (filters.timeRange === 'month') {
        params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        params.endDate = today.toISOString().split('T')[0];
      }

      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const data = await getTickets(params);
      setTickets(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError('Error al cargar los tickets. Revisa tu conexión o intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const sortedTickets = useMemo(() => {
    const result = [...tickets];

    if (filters.sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      result.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    }

    if (filters.sortBy === 'date') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (filters.sortBy === 'status') {
      result.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
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
    <Box className="dashboard-page">
      <Container maxWidth="xl" className="dashboard-container">
        <Card className="dashboard-hero" elevation={0}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={3}
            >
              <Box>
                <Chip
                  label="Mesa de ayuda"
                  size="small"
                  className="dashboard-eyebrow"
                />
                <Typography variant="h4" component="h1" className="dashboard-title">
                  Sistema de tickets de soporte
                </Typography>
                <Typography variant="body1" className="dashboard-subtitle">
                  Gestiona, prioriza y da seguimiento a las actividades del ingeniero de soporte técnico.
                </Typography>
              </Box>

              <Grid container spacing={1.5} className="stats-grid">
                {statConfig.map(({ key, label, icon: Icon, gradient }) => (
                  <Grid item xs={6} sm={3} md={6} lg={3} key={key}>
                    <Card
                      elevation={0}
                      className="stat-card"
                      sx={{ background: gradient }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" className="stat-label">
                              {label}
                            </Typography>
                            <Typography variant="h4" className="stat-value">
                              {stats?.[key] || 0}
                            </Typography>
                          </Box>
                          <Box className="stat-icon">
                            <Icon fontSize="small" />
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        <Box component="section" className="tickets-section">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            mb={2}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Tickets encontrados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sortedTickets.length} resultado{sortedTickets.length === 1 ? '' : 's'} con los filtros actuales
              </Typography>
            </Box>

            <Button
              startIcon={<RefreshRoundedIcon />}
              onClick={() => {
                fetchTickets();
                fetchStats();
              }}
              variant="outlined"
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Actualizar
            </Button>
          </Stack>

          {loading ? (
            <Card className="state-card" elevation={0}>
              <CircularProgress size={34} />
              <Typography>Cargando tickets...</Typography>
            </Card>
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={fetchTickets}>
                  Reintentar
                </Button>
              }
              sx={{ borderRadius: 3 }}
            >
              {error}
            </Alert>
          ) : sortedTickets.length === 0 ? (
            <Card className="state-card" elevation={0}>
              <Typography variant="h6" fontWeight={800}>
                Sin tickets por mostrar
              </Typography>
              <Typography color="text.secondary">
                No hay tickets que coincidan con los filtros seleccionados.
              </Typography>
            </Card>
          ) : (
            <Grid container spacing={2.5}>
              {sortedTickets.map((ticket) => (
                <Grid item xs={12} sm={6} lg={4} xl={3} key={ticket.id}>
                  <TicketCard ticket={ticket} onClick={() => handleTicketClick(ticket)} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      <TicketModal
        open={showModal}
        ticket={selectedTicket}
        onClose={() => setShowModal(false)}
        onUpdate={() => {
          fetchTickets();
          fetchStats();
          setShowModal(false);
        }}
      />
    </Box>
  );
};

export default DashboardPage;
