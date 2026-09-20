import React, { Suspense, lazy } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const StreamerDashboard = lazy(() => import('./pages/StreamerDashboard'));
const CCTOverlay = lazy(() => import('./pages/CCTOverlay'));
const ViewerPage = lazy(() => import('./pages/ViewerPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createHashRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <StreamerDashboard />
      </ProtectedRoute>
    ),
  },
  { path: '/cct', element: <CCTOverlay /> },
  { path: '/viewer', element: <ViewerPage /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default function App() {
  return (
    <Suspense fallback={
      <div className="d-flex align-items-center justify-content-center vh-100 bg-dark text-white">
        <div className="spinner-border" />
      </div>
    }>
      <RouterProvider router={router} />
    </Suspense>
  );
}
