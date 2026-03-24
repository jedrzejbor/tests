import HomeIcon from '@/components/icons/HomeIcon';
import ShieldIcon from '@/components/icons/ShieldIcon';
import DamageIcon from '@/components/icons/DamageIcon';
import PaymentsIcon from '@/components/icons/PaymentsIcon';
import ClientIcon from '@/components/icons/ClientIcon';
import UsersIcon from '@/components/icons/UsersIcon';
import InsurersIcon from '@/components/icons/InsurersIcon';
import InsurerContactsIcon from '@/components/icons/InsurerContactsIcon';
import KnowledgeBaseIcon from '@/components/icons/KnowledgeBaseIcon';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Navigation configuration
 * Each item can have `showInMobileMenu?: true` to display in the bottom navbar
 * Items without `showInMobileMenu` or with `false` will appear in the "Więcej" drawer
 * Future support: add `requiredRole?: UserRole[]` for role-based access control
 */
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<SvgIconProps>;
  /** If true, shows in mobile bottom navbar; otherwise in "Więcej" drawer */
  showInMobileMenu?: boolean;
  /** Future: specify roles that can access this item */
  requiredRoles?: string[];
}

export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Pulpit',
    path: '/app/dashboard',
    icon: HomeIcon,
    showInMobileMenu: true
  },
  {
    id: 'policies',
    label: 'Polisy',
    path: '/app/policies',
    icon: ShieldIcon,
    showInMobileMenu: true
  },
  {
    id: 'damages',
    label: 'Szkody',
    path: '/app/damages',
    icon: DamageIcon,
    showInMobileMenu: true
  },
  {
    id: 'payments',
    label: 'Płatności',
    path: '/app/payments',
    icon: PaymentsIcon,
    showInMobileMenu: true
  },
  {
    id: 'clients',
    label: 'Klienci',
    path: '/app/clients',
    icon: ClientIcon,
    showInMobileMenu: false
  },
  {
    id: 'users',
    label: 'Użytkownicy',
    path: '/app/users',
    icon: UsersIcon,
    showInMobileMenu: false
  },
  {
    id: 'insurers',
    label: 'Ubezpieczyciele',
    path: '/app/insurers',
    icon: InsurersIcon,
    showInMobileMenu: false
  },
  {
    id: 'insurer-contacts',
    label: 'Ubezpieczyciel Kontakty',
    path: '/app/insurer-contacts',
    icon: InsurerContactsIcon,
    showInMobileMenu: false
  },
  {
    id: 'forms',
    label: 'Formularze',
    path: '/app/forms',
    icon: InsurerContactsIcon,
    showInMobileMenu: false
  },
  {
    id: 'knowledge-base',
    label: 'Baza wiedzy',
    path: '/app/knowledge-base',
    icon: KnowledgeBaseIcon,
    showInMobileMenu: false
  },
  {
    id: 'reports',
    label: 'Raporty',
    path: '/app/reports',
    icon: AssessmentOutlinedIcon,
    showInMobileMenu: false
  },
  {
    id: 'event-logs',
    label: 'Logi zdarzeń',
    path: '/app/event-logs',
    icon: HistoryOutlinedIcon,
    showInMobileMenu: false
  }
];

/**
 * Get items to show in mobile bottom navbar
 */
export const getMobileMenuItems = (): NavItem[] => {
  return navigationItems.filter((item) => item.showInMobileMenu === true);
};

/**
 * Get items to show in "Więcej" drawer
 */
export const getMoreMenuItems = (): NavItem[] => {
  return navigationItems.filter((item) => item.showInMobileMenu !== true);
};

/**
 * Future: Get items based on user role
 * @param roles User's roles
 */
export const getAccessibleItems = (roles?: string[]): NavItem[] => {
  if (!roles || roles.length === 0) {
    return navigationItems;
  }
  return navigationItems.filter((item) => {
    // If no requiredRoles specified, item is accessible to everyone
    if (!item.requiredRoles || item.requiredRoles.length === 0) {
      return true;
    }
    // Item is accessible if user has at least one of the required roles
    return item.requiredRoles.some((role) => roles.includes(role));
  });
};
