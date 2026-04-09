// AccountBalanceWalletOutlinedIcon replaced by PaymentsIcon
import PaymentsIcon from '@/components/icons/PaymentsIcon';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import InsurersIcon from '@/components/icons/InsurersIcon';
import ClientIcon from '@/components/icons/ClientIcon';
import UsersIcon from '@/components/icons/UsersIcon';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import DamageIcon from '@/components/icons/DamageIcon';
import KnowledgeBaseIcon from '@/components/icons/KnowledgeBaseIcon';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import InsurerContactsIcon from '@/components/icons/InsurerContactsIcon';
import ShieldIcon from '@/components/icons/ShieldIcon';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Container, Box } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef } from 'react';

import AppShell, { BreadcrumbItem } from '@/components/layout/AppShell';
import { MenuSection, MenuItem } from '@/components/navigation/DesktopSidebar';
import { UserMenuOption } from '@/components/navigation/UserMenu';
import { useAuthStore } from '@/store/authStore';
import { useListStateStore } from '@/store/listStateStore';
import { usePermission } from '@/hooks/usePermission';
import homeIcon from '@/assets/home-icon.svg';

// Mobile navigation items (for bottom bar)
const navItems = [
  {
    label: 'Panel główny',
    to: '/app',
    icon: (
      <Box
        component="img"
        src={homeIcon}
        alt="Home"
        sx={{ width: 24, height: 24, display: 'block' }}
      />
    )
  },
  {
    label: 'Konto',
    to: '/konto',
    icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 24, width: 24, height: 24 }} />
  }
];

// Desktop sidebar menu sections — items with optional permission requirements
interface PermissionedMenuItem extends MenuItem {
  /** If set, the item is shown only when the user has this permission */
  requiredPermission?: string;
}

interface PermissionedMenuSection {
  items: PermissionedMenuItem[];
}

const allMenuSections: PermissionedMenuSection[] = [
  {
    items: [
      {
        label: 'Pulpit',
        to: '/app/dashboard',
        icon: (
          <Box
            component="img"
            src={homeIcon}
            alt="Home"
            sx={{ width: 24, height: 24, display: 'block' }}
          />
        )
      },
      {
        label: 'Polisy',
        to: '/app/policies',
        icon: <ShieldIcon sx={{ fontSize: 24 }} />,
        requiredPermission: 'policy view-list'
      },
      {
        label: 'Szkody',
        to: '/app/damages',
        icon: <DamageIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Płatności składek',
        to: '/app/payments',
        icon: <PaymentsIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Klienci',
        to: '/app/clients',
        icon: <ClientIcon sx={{ fontSize: 24 }} />,
        requiredPermission: 'client view-list'
      },
      {
        label: 'Użytkownicy',
        to: '/app/users',
        icon: <UsersIcon sx={{ fontSize: 24 }} />,
        requiredPermission: 'user view-list'
      },
      {
        label: 'Ubezpieczyciele',
        to: '/app/insurers',
        icon: <InsurersIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Ubezpieczyciel Kontakty',
        to: '/app/insurer-contacts',
        icon: <InsurerContactsIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Formularze',
        to: '/app/forms',
        icon: <InsurerContactsIcon sx={{ fontSize: 24 }} />
      }
    ]
  },
  {
    items: [
      {
        label: 'Baza wiedzy',
        to: '/app/knowledge-base',
        icon: <KnowledgeBaseIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Raporty',
        to: '/app/reports',
        icon: <AssessmentOutlinedIcon sx={{ fontSize: 24 }} />
      },
      {
        label: 'Logi zdarzeń',
        to: '/app/event-logs',
        icon: <HistoryOutlinedIcon sx={{ fontSize: 24 }} />
      }
    ]
  }
];

const AppLayout = () => {
  const resetAuth = useAuthStore((state) => state.resetAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const { clearListState } = useListStateStore();
  const { hasPermission } = usePermission();

  // Filter menu sections based on user permissions
  const menuSections: MenuSection[] = useMemo(() => {
    return allMenuSections
      .map((section) => ({
        items: section.items.filter(
          (item) => !item.requiredPermission || hasPermission(item.requiredPermission)
        )
      }))
      .filter((section) => section.items.length > 0);
  }, [hasPermission]);

  // List routes that have persisted state
  const STATEFUL_ROUTES = ['/app/clients', '/app/users'];

  // Clear persisted list state for any route we navigate away from
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    const prev = prevPathnameRef.current;
    const curr = location.pathname;
    prevPathnameRef.current = curr;

    STATEFUL_ROUTES.forEach((route) => {
      if (prev.startsWith(route) && !curr.startsWith(route)) {
        clearListState(route);
      }
    });
  }, [location.pathname, clearListState]);

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;

    // Always start with Pulpit
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Pulpit', href: '/app/dashboard' }];

    // Map of routes to breadcrumb labels
    const routeMap: Record<string, string> = {
      '/app/dashboard': 'Pulpit',
      '/app/account': 'Szczegóły konta',
      '/app/policies': 'Polisy',
      '/app/damages': 'Szkody',
      '/app/payments': 'Płatności składek',
      '/app/clients': 'Klienci',
      '/app/users': 'Użytkownicy',
      '/app/insurers': 'Ubezpieczyciele',
      '/app/insurer-contacts': 'Ubezpieczyciel Kontakty',
      '/app/forms': 'Formularze',
      '/app/knowledge-base': 'Baza wiedzy',
      '/app/reports': 'Raporty',
      '/app/event-logs': 'Logi zdarzeń'
    };

    if (path !== '/app/dashboard' && routeMap[path]) {
      breadcrumbs.push({ label: routeMap[path] });
    }

    // Handle dynamic routes like /app/users/:userId
    if (path.startsWith('/app/users/') && path !== '/app/users') {
      breadcrumbs.push({ label: 'Lista użytkowników', href: '/app/users' });
      breadcrumbs.push({ label: 'Szczegóły użytkownika' });
    }

    // Handle dynamic routes like /app/clients/:clientId
    if (path.startsWith('/app/clients/') && path !== '/app/clients') {
      breadcrumbs.push({ label: 'Lista klientów', href: '/app/clients' });
      breadcrumbs.push({ label: 'Szczegóły klienta' });
    }

    // Handle dynamic routes like /app/policies/:policyId
    if (path.startsWith('/app/policies/') && path !== '/app/policies') {
      breadcrumbs.push({ label: 'Lista polis', href: '/app/policies' });
      breadcrumbs.push({ label: `Karta polisy` });
    }

    return breadcrumbs;
  };

  const handleLogout = () => {
    resetAuth();
    navigate('/login', { replace: true });
  };

  const userMenuOptions: UserMenuOption[] = [
    {
      label: 'Ustawienia konta',
      icon: <SettingsOutlinedIcon sx={{ fontSize: 24 }} />,
      onClick: () => navigate('/app/settings')
    },
    {
      label: 'Dane firmy',
      icon: <BusinessOutlinedIcon sx={{ fontSize: 24 }} />,
      onClick: () => navigate('/app/company')
    },
    {
      label: 'Dane kontaktowe zespołu',
      icon: <PeopleAltOutlinedIcon sx={{ fontSize: 24 }} />,
      onClick: () => navigate('/app/team-contacts')
    }
  ];

  return (
    <AppShell
      navItems={navItems}
      menuSections={menuSections}
      breadcrumbs={getBreadcrumbs()}
      userMenuOptions={userMenuOptions}
      onLogout={handleLogout}
    >
      <Container
        disableGutters
        maxWidth={false}
        sx={{
          maxWidth: '100%',
          pl: { xs: 3, md: 0 },
          pr: 3,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Outlet />
      </Container>
    </AppShell>
  );
};

export default AppLayout;
