import React from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import '../styles/FilterBar.css';

const timeRangeOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todos' },
];

const priorityOptions = [
  { value: 'all-priority', label: 'Todas' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const statusOptions = [
  { value: 'all-status', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'closed', label: 'Cerrados' },
  { value: 'on_hold', label: 'En espera' },
];

const sortOptions = [
  { value: 'date', label: 'Más recientes' },
  { value: 'priority', label: 'Por urgencia' },
  { value: 'status', label: 'Por estado' },
];

const serviceTypeOptions = [
  { value: '', label: 'Todos' },
  { value: 'Sistemas', label: 'Sistemas' },
  { value: 'Soporte Técnico', label: 'Soporte Técnico' },
];

const FilterBar = ({ filters, onFilterChange, users = [], isAdmin = false }) => {
  return (
    <Card className="filter-bar" elevation={0}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} className="filter-title">
          <TuneRoundedIcon fontSize="small" />
          <Box component="span">Filtros de búsqueda</Box>
        </Stack>

        <Box className={`filter-grid${isAdmin ? ' filter-grid-admin' : ''}`}>
          <TextField
            fullWidth
            label="Buscar ticket"
            placeholder="Asunto, persona, área..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            size="small"
            className="filter-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Período</InputLabel>
            <Select
              label="Período"
              value={filters.timeRange}
              onChange={(e) => onFilterChange({ timeRange: e.target.value })}
            >
              {timeRangeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Urgencia</InputLabel>
            <Select
              label="Urgencia"
              value={filters.priority || ''}
              onChange={(e) => onFilterChange({ priority: e.target.value || null })}
            >
              {priorityOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              label="Estado"
              value={filters.status || ''}
              onChange={(e) => onFilterChange({ status: e.target.value || null })}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isAdmin && (
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de servicio</InputLabel>
              <Select
                label="Tipo de servicio"
                value={filters.serviceType || ''}
                onChange={(e) => onFilterChange({ serviceType: e.target.value || null })}
              >
                {serviceTypeOptions.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Asignado a</InputLabel>
            <Select
              label="Asignado a"
              value={filters.assignedTo || ''}
              onChange={(e) => onFilterChange({ assignedTo: e.target.value || null })}
            >
              <MenuItem value="">Todas las personas</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Ordenar</InputLabel>
            <Select
              label="Ordenar"
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value })}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
