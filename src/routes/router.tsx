import { createBrowserRouter, Navigate } from 'react-router-dom';

import AccountPage from '@/pages/AccountPage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import TwoFactorAuthPage from '@/pages/TwoFactorAuthPage';
import NotFoundPage from '@/pages/NotFoundPage';
import UnavailablePage from '@/pages/UnavailablePage';
import SettingsPage from '@/pages/SettingsPage';
import UsersPage from '@/pages/UsersPage';
import UserDetailsPage from '@/pages/UserDetailsPage';
import ResetPasswordTokenPage from '@/pages/ResetPasswordTokenPage';
import AppErrorBoundary from '@/routes/AppErrorBoundary';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuthStore } from '@/store/authStore';

// eslint-disable-next-line react-refresh/only-export-components
const LandingRedirect = () => {
  const token = useAuthStore((state) => state.token);

  return <Navigate to={token ? '/app' : '/login'} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingRedirect />,
    errorElement: <AppErrorBoundary />
  },
  {
    element: <AuthLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        path: '/login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        )
      },
      {
        path: '/reset-password',
        element: (
          <PublicRoute>
            <LoginPage initialStage="forgot" />
          </PublicRoute>
        )
      },
      {
        path: '/reset/:token',
        element: (
          <PublicRoute>
            <ResetPasswordTokenPage />
          </PublicRoute>
        )
      },
      {
        path: '/verify',
        element: (
          <PublicRoute>
            <TwoFactorAuthPage />
          </PublicRoute>
        )
      }
    ]
  },
  {
    element: <AppLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        path: '/app',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/policies',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/claims',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/payments',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/documents',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/support',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/users',
        element: (
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/users/:userId',
        element: (
          <ProtectedRoute>
            <UserDetailsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/konto',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/*',
        element: (
          <ProtectedRoute>
            <UnavailablePage />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
