import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const CallbackPage = lazy(() => import('./pages/CallbackPage'));
const StreamerDashboard = lazy(() => import('./pages/StreamerDashboard'));
const CCTOverlay = lazy(() => import('./pages/CCTOverlay'));
const ViewerPage = lazy(() => import('./pages/ViewerPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/callback', element: <CallbackPage /> },
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
  { path: '/viewer-callback', element: <ViewerPage /> },
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
