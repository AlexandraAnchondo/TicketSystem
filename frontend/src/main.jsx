import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

import App from './App';
import Layout from './layouts/dashboard';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';

function PrivateRoute({ children }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const routes = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    Component: App,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: "/",
        Component: Layout,
        children: [
          {
            path: "inicio",
            element: (
              <PrivateRoute>
                <Inicio />
              </PrivateRoute>
            )
          },
          {
            path: "dashboard",
            element: (
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            )
          }
        ],
      },
    ],
  }
];

const isElectron = window.location.protocol === 'file:';

const router = isElectron
  ? createHashRouter(routes)
  : createBrowserRouter(routes, {
    basename: '/tickets',
  });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);