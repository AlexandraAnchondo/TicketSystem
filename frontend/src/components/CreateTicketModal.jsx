import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';

import { createTicket, getAreas, getUsers } from '../data/API';

const priorityOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const difficultyOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const initialForm = {
  subject: '',
  description: '',
  attendedPerson: '',
  area: '',
  areaId: '',
  priority: 'medium',
  difficulty: 'medium',
  assignedTo: '',
};

const getOptionId = (item) => item.id ?? item.areaId ?? item.IdArea ?? item.Id ?? item.userId ?? item.IdUsuario;
const getAreaName = (item) => item.name ?? item.nombre ?? item.area ?? item.Nombre ?? item.Area;
const getUserName = (item) => item.name ?? item.nombre ?? item.usuario ?? item.NombreUsuario ?? item.Usuario;

const CreateTicketModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isValid = form.subject.trim() && form.description.trim() && form.attendedPerson.trim();

  useEffect(() => {
    if (!open) return;

    setForm(initialForm);
    setError('');

    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [areasData, usersData] = await Promise.allSettled([getAreas(), getUsers()]);

        if (areasData.status === 'fulfilled') {
          const value = areasData.value;
          setAreas(Array.isArray(value) ? value : value?.data || []);
        }

        if (usersData.status === 'fulfilled') {
          const value = usersData.value;
          setUsers(Array.isArray(value) ? value : value?.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCatalogs(false);
      }
    };

    loadCatalogs();
  }, [open]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    if (field === 'areaId') {
      const selectedArea = areas.find((area) => String(getOptionId(area)) === String(value));
      setForm((prev) => ({
        ...prev,
        areaId: value,
        area: selectedArea ? getAreaName(selectedArea) : '',
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Completa asunto, descripción y persona atendida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        subject: form.subject.trim(),
        description: form.description.trim(),
        attendedPerson: form.attendedPerson.trim(),
        area: form.area?.trim() || null,
        areaId: form.areaId || null,
        priority: form.priority,
        difficulty: form.difficulty,
        assignedTo: form.assignedTo || null,
        status: 'open',
      };

      await createTicket(payload);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data?.error || 'No se pudo crear el ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AddCircleRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Crear nuevo ticket
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registra una nueva actividad de soporte técnico.
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={onClose} disabled={saving}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {loadingCatalogs && (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              Cargando áreas y usuarios...
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Asunto"
                placeholder="Ej. Instalación de impresora, revisión de equipo..."
                value={form.subject}
                onChange={handleChange('subject')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                minRows={4}
                label="Descripción"
                placeholder="Describe el problema o actividad realizada..."
                value={form.description}
                onChange={handleChange('description')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Persona atendida"
                placeholder="Nombre de la persona solicitante"
                value={form.attendedPerson}
                onChange={handleChange('attendedPerson')}
              />
            </Grid>

            <Grid item xs={12} md={6} minWidth={200}>
              <FormControl fullWidth>
                <InputLabel>Área</InputLabel>
                <Select
                  label="Área"
                  value={form.areaId}
                  onChange={handleChange('areaId')}
                >
                  <MenuItem value="">
                    <em>Sin área</em>
                  </MenuItem>
                  {areas.map((area) => {
                    const id = getOptionId(area);
                    const name = getAreaName(area);
                    return (
                      <MenuItem key={id ?? name} value={id ?? name}>
                        {name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            {areas.length === 0 && (
              <Grid item xs={12} minWidth={200}>
                <TextField
                  fullWidth
                  label="Área manual"
                  placeholder="Captura el área si no tienes catálogo"
                  value={form.area}
                  onChange={handleChange('area')}
                />
              </Grid>
            )}

            <Grid item xs={12} md={4} minWidth={200}>
              <FormControl fullWidth>
                <InputLabel>Urgencia</InputLabel>
                <Select
                  label="Urgencia"
                  value={form.priority}
                  onChange={handleChange('priority')}
                >
                  {priorityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} minWidth={200}>
              <FormControl fullWidth>
                <InputLabel>Dificultad</InputLabel>
                <Select
                  label="Dificultad"
                  value={form.difficulty}
                  onChange={handleChange('difficulty')}
                >
                  {difficultyOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} minWidth={200}>
              <FormControl fullWidth>
                <InputLabel>Asignar a</InputLabel>
                <Select
                  label="Asignar a"
                  value={form.assignedTo}
                  onChange={handleChange('assignedTo')}
                >
                  <MenuItem value="">
                    <em>Sin asignar</em>
                  </MenuItem>
                  {users.map((user) => {
                    const id = getOptionId(user);
                    const name = getUserName(user);
                    return (
                      <MenuItem key={id ?? name} value={id ?? name}>
                        {name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={saving}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !isValid}
          startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <SaveRoundedIcon />}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
        >
          Guardar ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTicketModal;
