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
import ClientsPage from '@/pages/ClientsPage';
import ClientDetailsPage from '@/pages/ClientDetailsPage';
import PoliciesPage from '@/pages/PoliciesPage';
import PolicyDetailsPage from '@/pages/PolicyDetailsPage';
import ClaimsPage from '@/pages/ClaimsPage';
import ReportClaimPage from '@/pages/ReportClaimPage';
import ResetPasswordTokenPage from '@/pages/ResetPasswordTokenPage';
import SetPasswordTokenPage from '@/pages/SetPasswordTokenPage';
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
        path: '/set-password',
        element: (
          <PublicRoute>
            <LoginPage initialStage="reset" isNewAccount />
          </PublicRoute>
        )
      },
      {
        path: '/set-password/:token',
        element: (
          <PublicRoute>
            <SetPasswordTokenPage />
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
            <PoliciesPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/policies/:policyId',
        element: (
          <ProtectedRoute>
            <PolicyDetailsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/damages/new',
        element: (
          <ProtectedRoute>
            <ReportClaimPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/damages',
        element: (
          <ProtectedRoute>
            <ClaimsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/claims',
        element: (
          <ProtectedRoute>
            <ClaimsPage />
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
        path: '/app/clients',
        element: (
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/app/clients/:clientId',
        element: (
          <ProtectedRoute>
            <ClientDetailsPage />
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
