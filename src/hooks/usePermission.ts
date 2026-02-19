import { useAuthStore } from '@/store/authStore';

/**
 * Hook do sprawdzania uprawnień zalogowanego użytkownika.
 *
 * Użycie:
 * ```ts
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
 * if (hasPermission('user create')) { ... }
 * ```
 */
export const usePermission = () => {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);

  /** Sprawdza czy użytkownik ma konkretne uprawnienie */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /** Sprawdza czy użytkownik ma przynajmniej jedno z podanych uprawnień */
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((p) => permissions.includes(p));
  };

  /** Sprawdza czy użytkownik ma wszystkie podane uprawnienia */
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((p) => permissions.includes(p));
  };

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
};

export default usePermission;
