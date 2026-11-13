import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import { createActivity, getActivities } from '../data/API';

const serviceTypes = ['Sistemas', 'Soporte Técnico'];
const initialForm = { name: '', serviceType: 'Soporte Técnico' };

const ActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivities();
      setActivities(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Error al cargar actividades:', err);
      setError('No se pudieron cargar las actividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const visibleActivities = filter
    ? activities.filter((activity) => activity.serviceType === filter)
    : activities;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Escribe el nombre de la actividad.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createActivity({ name, serviceType: form.serviceType });
      setForm(initialForm);
      setSuccess('Actividad creada correctamente.');
      await loadActivities();
    } catch (err) {
      console.error('Error al crear actividad:', err);
      setError(err.response?.data?.error || err.error || 'No se pudo crear la actividad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 4 }, background: 'var(--dashboard-gradient)' }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={900} color="var(--dashboard-title)">
              Catálogo de actividades
            </Typography>
            <Typography color="text.secondary">
              Registra actividades y clasifícalas como Sistemas o Soporte Técnico.
            </Typography>
          </Box>

          <Card elevation={0} sx={{ borderRadius: 4, background: 'var(--background-color)' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight={800} mb={2}>
                Nueva actividad
              </Typography>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Nombre de la actividad"
                      value={form.name}
                      inputProps={{ maxLength: 150 }}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel id="activity-service-type-label">Tipo de servicio</InputLabel>
                      <Select
                        labelId="activity-service-type-label"
                        label="Tipo de servicio"
                        value={form.serviceType}
                        onChange={(event) => setForm((prev) => ({ ...prev, serviceType: event.target.value }))}
                      >
                        {serviceTypes.map((type) => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <AddRoundedIcon />}
                      sx={{ minHeight: 56, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
                    >
                      {saving ? 'Guardando' : 'Agregar'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 4, background: 'var(--background-color)' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                mb={2}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <ListAltRoundedIcon color="primary" />
                  <Typography variant="h6" fontWeight={800}>Actividades registradas</Typography>
                </Stack>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="activity-filter-label">Tipo de servicio</InputLabel>
                  <Select
                    labelId="activity-filter-label"
                    label="Tipo de servicio"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {serviceTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {loading ? (
                <Stack alignItems="center" py={4}><CircularProgress /></Stack>
              ) : visibleActivities.length === 0 ? (
                <Typography color="text.secondary" py={2}>
                  No hay actividades para mostrar con este filtro.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {visibleActivities.map((activity) => (
                    <Card key={activity.id} variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ py: '12px !important' }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={0.5}
                        >
                          <Typography fontWeight={700}>{activity.name}</Typography>
                          <Typography color="text.secondary">{activity.serviceType}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default ActivitiesPage;
