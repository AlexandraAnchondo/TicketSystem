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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ViewModuleRoundedIcon from '@mui/icons-material/ViewModuleRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';

import { getTickets, getTicketStats, getUsers, getCurrentUser } from '../data/API';
import TicketCard from '../components/TicketCard';
import DataTable from '../components/DataGrid';
import TicketModal from '../components/TicketModal';
import CreateTicketModal from '../components/CreateTicketModal';
import FilterBar from '../components/FilterBar';
import UserDepartmentDialog from '../components/UserDepartmentDialog';
import '../styles/DashboardPage.css';

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
  {
    key: 'onHold',
    label: 'En espera',
    icon: CheckCircleRoundedIcon,
    gradient: 'linear-gradient(135deg, #b1920b 0%, #d8b411 100%)',
  },
];

const getPeriodParams = (timeRange) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  if (timeRange === 'today') {
    return { startDate: endDate, endDate };
  }

  if (timeRange === 'week') {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return { startDate: weekStart.toISOString().split('T')[0], endDate };
  }

  if (timeRange === 'month') {
    return {
      startDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
      endDate,
    };
  }

  return {};
};

const getInitialAssignedTo = () => {
  const userId = Number(localStorage.getItem('id_usuario'));
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};

const DashboardPage = () => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserDepartmentDialog, setShowUserDepartmentDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  const [filters, setFilters] = useState({
    timeRange: 'today',
    priority: 'all-priority',
    status: 'all-status',
    serviceType: '',
    assignedTo: getInitialAssignedTo(),
    search: '',
    sortBy: 'date',
  });

  const [stats, setStats] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: filters.search,
        page: 1,
        limit: 100,
        ...getPeriodParams(filters.timeRange),
      };

      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.serviceType && currentUser?.isAdmin) params.serviceType = filters.serviceType;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;

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
      const params = {
        ...getPeriodParams(filters.timeRange),
      };
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;

      const statsData = await getTicketStats(params);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [
    filters.timeRange,
    filters.priority,
    filters.status,
    filters.serviceType,
    filters.assignedTo,
    filters.search,
    currentUser?.isAdmin,
  ]);

  useEffect(() => {
    let active = true;
    getUsers()
      .then((data) => {
        if (active) setUsers(Array.isArray(data) ? data : data?.data || []);
      })
      .catch((err) => console.error('Error al cargar usuarios para filtrar tickets:', err));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .catch((err) => console.error('Error al cargar el usuario actual:', err));

    return () => {
      active = false;
    };
  }, []);

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

  const ticketColumns = [
    {
      field: 'ticketRef',
      headerName: 'Ticket',
      width: 100,
      valueGetter: (_value, row) => `#${row.id}`,
    },
    { field: 'subject', headerName: 'Actividad', minWidth: 350, flex: 1 },
    { field: 'attendedPerson', headerName: 'Persona atendida', minWidth: 160 },
    { field: 'assignedToName', headerName: 'Asignado a', minWidth: 180 },
    { field: 'area', headerName: 'Área', minWidth: 350 },
    {
      field: 'status',
      headerName: 'Estado',
      minWidth: 130,
      valueGetter: (_value, row) => ({
        open: 'Abierto',
        in_progress: 'En progreso',
        closed: 'Cerrado',
        on_hold: 'En espera',
      }[row.status] || row.status || 'Sin estado'),
    },
    {
      field: 'priority',
      headerName: 'Urgencia',
      minWidth: 110,
      valueGetter: (_value, row) => ({
        critical: 'Crítica',
        high: 'Alta',
        medium: 'Media',
        low: 'Baja',
      }[row.priority] || row.priority || 'Sin urgencia'),
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      minWidth: 270,
      valueFormatter: (value) => value
        ? new Date(value).toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        })
        : 'Sin fecha',
    },
  ];

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
                  Gestiona, prioriza y da seguimiento a las actividades de soporte técnico.
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

        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          users={users}
          isAdmin={currentUser?.isAdmin === true}
        />

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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_event, value) => {
                  if (value) setViewMode(value);
                }}
                aria-label="Vista de tickets"
              >
                <ToggleButton value="cards" aria-label="Ver tickets como tarjetas">
                  <ViewModuleRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Cards
                </ToggleButton>
                <ToggleButton value="table" aria-label="Ver tickets como tabla">
                  <TableRowsRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Tabla
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                startIcon={<AddRoundedIcon />}
                onClick={() => setShowCreateModal(true)}
                variant="contained"
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, backgroundColor: "var(--buttons) !important" }}
              >
                Nuevo ticket
              </Button>

              {currentUser?.isAdmin && (
                <Button
                  startIcon={<ManageAccountsRoundedIcon />}
                  onClick={() => setShowUserDepartmentDialog(true)}
                  variant="outlined"
                  sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
                >
                  Departamentos
                </Button>
              )}

              <Button
                startIcon={<RefreshRoundedIcon />}
                onClick={() => {
                  fetchTickets();
                  fetchStats();
                }}
                variant="outlined"
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, borderColor: "var(--buttons) !important" }}
              >
                Actualizar
              </Button>
            </Stack>
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
          ) : viewMode === 'table' ? (
            <DataTable
              rows={sortedTickets}
              columns={ticketColumns}
              sortingMode="desc"
              onRowClick={(params) => handleTicketClick(params.row)}
            />
          ) : (
            <Box className="tickets-cards-grid">
              {sortedTickets.map((ticket) => (
                <Box key={ticket.id} sx={{ minWidth: 0 }}>
                  <TicketCard ticket={ticket} onClick={() => handleTicketClick(ticket)} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Container>


      <CreateTicketModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          fetchTickets();
          fetchStats();
        }}
      />

      <TicketModal
        open={showModal}
        ticket_id={selectedTicket?.id || null}
        onClose={() => setShowModal(false)}
        onUpdate={() => {
          fetchTickets();
          fetchStats();
          setShowModal(false);
        }}
      />

      <UserDepartmentDialog
        open={showUserDepartmentDialog}
        onClose={() => setShowUserDepartmentDialog(false)}
      />
    </Box>
  );
};

export default DashboardPage;
