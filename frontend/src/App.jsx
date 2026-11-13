import * as React from 'react';
import { Outlet } from 'react-router';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import logo from './assets/Avatar.png';
import "./styles/App.css";

const BRANDING = {
  title: "Ticket System",
  logo: (
    <img
      src={logo}
      alt="Logo"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  ),
};

export default function App() {
  const navigation = [
    {
      kind: 'header',
      title: 'NAVEGACIÓN',
    },
    {
      segment: 'inicio',
      title: 'Inicio',
      icon: <HomeIcon />,
      pattern: 'inicio',
    },
    {
      segment: 'dashboard',
      title: 'Dashboard',
      icon: <DashboardIcon />,
      pattern: 'dashboard',
    },
    {
      segment: 'actividades',
      title: 'Actividades',
      icon: <ListAltRoundedIcon />,
      pattern: 'actividades',
    },
  ];

  return (
    <ReactRouterAppProvider
      navigation={navigation}
      branding={BRANDING}
    >
      <Outlet />
    </ReactRouterAppProvider>
  );
}
