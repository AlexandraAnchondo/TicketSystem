import React from 'react';
import './FilterBar.css';

const FilterBar = ({ filters, onFilterChange }) => {
  const timeRangeOptions = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mes' },
    { value: 'all', label: 'Todos' },
  ];

  const priorityOptions = [
    { value: null, label: 'Todas Urgencias' },
    { value: 'critical', label: 'Crítica' },
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Media' },
    { value: 'low', label: 'Baja' },
  ];

  const statusOptions = [
    { value: null, label: 'Todos Estados' },
    { value: 'open', label: 'Abiertos' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'closed', label: 'Cerrados' },
    { value: 'on_hold', label: 'En Espera' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Más Recientes' },
    { value: 'priority', label: 'Por Urgencia' },
    { value: 'status', label: 'Por Estado' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-container">
        {/* Search */}
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="search-input"
          />
        </div>

        {/* Time Range */}
        <div className="filter-group">
          <label className="filter-label">Período:</label>
          <select
            value={filters.timeRange}
            onChange={(e) => onFilterChange({ timeRange: e.target.value })}
            className="filter-select"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="filter-group">
          <label className="filter-label">Urgencia:</label>
          <select
            value={filters.priority || ''}
            onChange={(e) => onFilterChange({ priority: e.target.value || null })}
            className="filter-select"
          >
            {priorityOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="filter-group">
          <label className="filter-label">Estado:</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value || null })}
            className="filter-select"
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="filter-group">
          <label className="filter-label">Ordenar:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value })}
            className="filter-select"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;