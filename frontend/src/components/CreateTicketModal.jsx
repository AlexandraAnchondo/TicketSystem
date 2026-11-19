import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
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
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

import {
  createTicket,
  getActivities,
  getAreas,
  getCurrentUser,
  getEmployees,
} from '../data/API';

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

const serviceTypeOptions = ['Sistemas', 'Soporte Técnico'];

const initialForm = {
  activityId: '',
  description: '',
  attendedPerson: '',
  departmentId: '',
  serviceType: 'Soporte Técnico',
  priority: 'medium',
  difficulty: 'medium',
};

const getOptionId = (item) => item.id ?? item.departmentId ?? item.IdDepartamento;
const getAreaName = (item) => item.nombre ?? item.DepartamentoNombre ?? item.Departamento;
const getActivityName = (item) => item.name ?? item.nombre;

const getCurrentUserName = () => {
  const storedUser = localStorage.getItem('usuario');
  if (!storedUser) return 'Usuario conectado';

  try {
    const user = JSON.parse(storedUser);
    if (typeof user === 'string') return user;
    return user.nombreCompleto || user.nombre || user.NombreUsuario || user.usuario || 'Usuario conectado';
  } catch {
    return storedUser;
  }
};

const asArray = (value) => (Array.isArray(value) ? value : value?.data || []);

const CreateTicketModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [areas, setAreas] = useState([]);
  const [activities, setActivities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearchError, setEmployeeSearchError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentUserName = useMemo(getCurrentUserName, [open]);
  const isAdmin = currentUser?.isAdmin === true;

  const availableActivities = useMemo(
    () => activities.filter((activity) => activity.serviceType === form.serviceType),
    [activities, form.serviceType]
  );

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    const timeoutId = setTimeout(async () => {
      setLoadingEmployees(true);
      setEmployeeSearchError('');
      try {
        const employeeNames = await getEmployees(form.attendedPerson);
        if (active) setEmployees(Array.isArray(employeeNames) ? employeeNames : []);
      } catch (requestError) {
        console.error('Error al buscar empleados:', requestError);
        if (active) {
          setEmployees([]);
          setEmployeeSearchError('No se pudo cargar el directorio; puedes escribir el nombre manualmente.');
        }
      } finally {
        if (active) setLoadingEmployees(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [form.attendedPerson, open]);

  const isValid = Boolean(
    form.activityId
    && form.description.trim()
    && form.attendedPerson.trim()
    && form.departmentId
    && form.serviceType
  );

  useEffect(() => {
    if (!open) return undefined;

    setForm(initialForm);
    setCurrentUser(null);
    setError('');

    let active = true;
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [areasData, activitiesData, userData] = await Promise.all([
          getAreas(),
          getActivities(),
          getCurrentUser(),
        ]);
        if (active) {
          setAreas(asArray(areasData));
          setActivities(asArray(activitiesData));
          setCurrentUser(userData);
          setForm((prev) => ({
            ...prev,
            serviceType: userData.serviceType || initialForm.serviceType,
          }));
        }
      } catch (err) {
        console.error('Error al cargar los catálogos del ticket:', err);
        if (active) {
          setAreas([]);
          setActivities([]);
          setCurrentUser(null);
          setError(
            err.response?.data?.error
            || 'No se pudieron cargar las actividades o áreas. Cierra y vuelve a abrir el formulario.'
          );
        }
      } finally {
        if (active) setLoadingCatalogs(false);
      }
    };

    loadCatalogs();
    return () => {
      active = false;
    };
  }, [open]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'serviceType' ? { activityId: '' } : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createTicket({
        activityId: Number(form.activityId),
        description: form.description.trim(),
        attendedPerson: form.attendedPerson.trim(),
        departmentId: Number(form.departmentId),
        serviceType: form.serviceType,
        priority: form.priority,
        difficulty: form.difficulty,
        status: 'open',
      });
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
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: { xs: '22px 22px 0 0', sm: 5 },
          background: 'var(--ticket-modal-gradient)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: 3,
          color: '#fff',
          background: 'linear-gradient(120deg, #6a5fe7 0%, #8f56f1 58%, #c587ff 100%)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', width: 46, height: 46 }}>
              <AddCircleRoundedIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={900} color="white !important">
                Crear nuevo ticket
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                Registra una actividad y asigna el seguimiento al usuario conectado.
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Cerrar"
            onClick={onClose}
            disabled={saving}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 4 }, py: 3, background: 'var(--dashboard-gradient)' }}>
        <Stack spacing={2.5} mt={4}>
          {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

          {loadingCatalogs && (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              Cargando actividades y áreas...
            </Alert>
          )}

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 4,
              bgcolor: 'var(--background-color)',
              border: '1px solid var(--meta-border)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <BusinessCenterRoundedIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={850}>Datos del servicio</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {isAdmin ? (
                  <FormControl
                    fullWidth
                    required
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: 220,
                      },
                    }}
                  >
                    <InputLabel id="ticket-service-type-label">Tipo de servicio</InputLabel>
                    <Select
                      labelId="ticket-service-type-label"
                      label="Tipo de servicio"
                      value={form.serviceType}
                      onChange={handleChange('serviceType')}
                    >
                      {serviceTypeOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    label="Tipo de servicio"
                    value={form.serviceType}
                    disabled
                    helperText="Se asigna según tu departamento."
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl 
                  fullWidth 
                  required 
                  disabled={loadingCatalogs || availableActivities.length === 0}
                  sx={{
                    '& .MuiInputBase-root': {
                      minWidth: 220,
                    },
                  }}
                >
                  <InputLabel id="ticket-activity-label">Actividad</InputLabel>
                  <Select
                    labelId="ticket-activity-label"
                    label="Actividad"
                    value={form.activityId}
                    onChange={handleChange('activityId')}
                  >
                    {availableActivities.map((activity) => (
                      <MenuItem key={getOptionId(activity)} value={getOptionId(activity)}>
                        {getActivityName(activity)}
                      </MenuItem>
                    ))}
                  </Select>
                  {!loadingCatalogs && availableActivities.length === 0 && (
                    <FormHelperText>No hay actividades activas para este tipo de servicio.</FormHelperText>
                  )}
                </FormControl>
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
                  sx={{
                    '& .MuiInputBase-root': {
                      minWidth: 250,
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 4,
              bgcolor: 'var(--background-color)',
              border: '1px solid var(--meta-border)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <PersonRoundedIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={850}>Personas y área</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} minWidth={250}>
                <Autocomplete
                  freeSolo
                  options={employees}
                  value={form.attendedPerson}
                  inputValue={form.attendedPerson}
                  loading={loadingEmployees}
                  onChange={(_, value) => {
                    setForm((prev) => ({ ...prev, attendedPerson: value || '' }));
                  }}
                  onInputChange={(_, value) => {
                    setForm((prev) => ({ ...prev, attendedPerson: value }));
                  }}
                  noOptionsText="Sin coincidencias; puedes escribir el nombre"
                  loadingText="Buscando empleados..."
                  renderInput={(params) => (
                    <TextField
                      value={params.inputProps.value?.toUpperCase() || ''}
                      onChange={(e) => {
                        const upperValue = e.target.value.toUpperCase();
                        setForm((prev) => ({ ...prev, attendedPerson: upperValue }));
                      }}
                      {...params}
                      fullWidth
                      required
                      label="Persona atendida"
                      placeholder="Busca un empleado o escribe un nombre"
                      helperText={employeeSearchError}
                      error={Boolean(employeeSearchError)}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  required
                  sx={{
                    '& .MuiInputBase-root': {
                      minWidth: 250,
                    },
                  }}
                >
                  <Autocomplete
                    options={areas}
                    value={areas.find((area) => String(getOptionId(area)) === String(form.departmentId)) || null}
                    getOptionLabel={(area) => String(getAreaName(area) || '')}
                    isOptionEqualToValue={(option, value) => getOptionId(option) === getOptionId(value)}
                    onChange={(_, area) => {
                      setForm((prev) => ({ ...prev, departmentId: area ? getOptionId(area) : '' }));
                    }}
                    disabled={loadingCatalogs || areas.length === 0}
                    renderInput={(params) => <TextField {...params} label="Área" required />}
                  />
                  {!loadingCatalogs && areas.length === 0 && (
                    <FormHelperText>No hay áreas activas disponibles.</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asignado a"
                  value={currentUserName}
                  InputProps={{ readOnly: true }}
                  helperText="Se asignará automáticamente a tu usuario."
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': {
                      minWidth: 200,
                    },
                  }}
                >
                  <InputLabel id="ticket-priority-label">Urgencia</InputLabel>
                  <Select
                    labelId="ticket-priority-label"
                    label="Urgencia"
                    value={form.priority}
                    onChange={handleChange('priority')}
                  >
                    {priorityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': {
                      minWidth: 200,
                    },
                  }}
                >
                  <InputLabel id="ticket-difficulty-label">Dificultad</InputLabel>
                  <Select
                    labelId="ticket-difficulty-label"
                    label="Dificultad"
                    value={form.difficulty}
                    onChange={handleChange('difficulty')}
                  >
                    {difficultyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: { xs: 2, sm: 4 }, py: 2.5, bgcolor: 'var(--background-color)' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={saving}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, px: 2.5 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || loadingCatalogs || !isValid}
          startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <SaveRoundedIcon />}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 850,
            px: 2.5,
            color: '#fff !important',
            background: 'linear-gradient(120deg, #6a5fe7 0%, #8f56f1 58%, #c587ff 100%)',
          }}
        >
          {saving ? 'Guardando...' : 'Crear ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTicketModal;
