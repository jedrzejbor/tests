const CLIENT_ROLE_NAMES = new Set(['super admin client', 'admin client', 'client user']);

export const normalizeRoleName = (role: unknown): string => {
  if (typeof role !== 'string') return '';
  return role.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
};

export const isClientRole = (role: unknown): boolean =>
  CLIENT_ROLE_NAMES.has(normalizeRoleName(role));
