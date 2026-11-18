import React, { useEffect, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { getDepartmentAreas, getUsers, updateUserDepartmentArea } from '../data/API';

const UserDepartmentDialog = ({ open, onClose }) => {
  const [users, setUsers] = useState([]);
  const [departmentAreas, setDepartmentAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setLoading(true);
    setError('');

    Promise.all([getUsers(), getDepartmentAreas()])
      .then(([usersData, areasData]) => {
        if (active) {
          setUsers(usersData);
          setDepartmentAreas(areasData);
        }
      })
      .catch((requestError) => {
        console.error('Error al cargar usuarios o departamentos:', requestError);
        if (active) setError('No se pudieron cargar los usuarios o departamentos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const handleDepartmentChange = async (userId, departmentAreaId) => {
    setUpdatingUserId(userId);
    setError('');
    try {
      const updatedUser = await updateUserDepartmentArea(userId, departmentAreaId);
      setUsers((previousUsers) => previousUsers.map((user) => (
        user.id === userId ? { ...user, ...updatedUser } : user
      )));
    } catch (requestError) {
      console.error('Error al asignar el departamento:', requestError);
      setError(requestError.response?.data?.error || 'No se pudo asignar el departamento.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <Dialog open={open} onClose={updatingUserId ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Asignar departamento a usuarios</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            El tipo de servicio de los tickets se determinará por el departamento asignado.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : users.map((user) => (
            <Stack
              key={user.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
            >
              <Stack flex={1} minWidth={0}>
                <Typography fontWeight={700}>{user.nombre || user.username}</Typography>
                <Typography variant="caption" color="text.secondary">{user.username}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 190 }}>
                  <InputLabel id={`user-department-${user.id}`}>Departamento</InputLabel>
                  <Select
                    labelId={`user-department-${user.id}`}
                    label="Departamento"
                    value={user.departmentAreaId || ''}
                    disabled={updatingUserId === user.id}
                    onChange={(event) => handleDepartmentChange(user.id, event.target.value)}
                  >
                    {user.departmentAreaId == null && (
                      <MenuItem value="" disabled>Sin asignar</MenuItem>
                    )}
                    {departmentAreas.map((departmentArea) => (
                      <MenuItem key={departmentArea.id} value={departmentArea.id}>
                        {departmentArea.serviceType}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {updatingUserId === user.id && <CircularProgress size={18} />}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(updatingUserId)}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDepartmentDialog;
