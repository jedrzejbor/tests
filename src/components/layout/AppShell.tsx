import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
// import NightlightRoundRoundedIcon from '@mui/icons-material/NightlightRoundRounded';
// import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
// import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  AppBar,
  Avatar,
  Box,
  Breadcrumbs,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  // Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoLight from '@/assets/logo-light.svg';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { DesktopSidebar, MenuSection } from '@/components/navigation/DesktopSidebar';
import { UserMenu, UserMenuOption } from '@/components/navigation/UserMenu';
// import { useColorMode } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { logout } from '@/services/authService';
import ImpersonationBanner from '@/components/ImpersonationBanner';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  navItems?: { label: string; icon: React.ReactNode; to: string }[];
  menuSections?: MenuSection[];
  breadcrumbs?: BreadcrumbItem[];
  userMenuOptions?: UserMenuOption[];
  onLogout?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  menuSections,
  breadcrumbs,
  userMenuOptions,
  onLogout
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const [accountDrawerOpen, setAccountDrawerOpen] = React.useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };
  // const { toggleColorMode, mode } = useColorMode();
  const { user, resetAuth } = useAuthStore();
  const { addToast } = useUiStore();

  const toggleAccountDrawer = () => setAccountDrawerOpen((prev) => !prev);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      resetAuth();
      setAccountDrawerOpen(false);

      addToast({
        id: crypto.randomUUID(),
        message: 'Wylogowano pomyślnie',
        severity: 'success'
      });

      navigate('/login', { replace: true });
      onLogout?.();
    } catch (error) {
      resetAuth();
      setAccountDrawerOpen(false);

      const message = error instanceof Error ? error.message : 'Błąd wylogowania';
      addToast({
        id: crypto.randomUUID(),
        message,
        severity: 'warning'
      });

      navigate('/login', { replace: true });
      onLogout?.();
    } finally {
      setLoggingOut(false);
    }
  };

  const currentSidebarWidth = sidebarCollapsed ? 80 : 260;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      {/* Impersonation banner – always on top */}
      <ImpersonationBanner />

      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        {isMdUp && menuSections && (
          <DesktopSidebar
            sections={menuSections}
            onCollapsedChange={handleSidebarCollapsedChange}
          />
        )}

        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{
            borderColor: 'divider',
            ml: isMdUp ? `${currentSidebarWidth + 40}px` : 0,
            width: isMdUp ? `calc(100% - ${currentSidebarWidth + 40}px)` : '100%',
            transition: 'all 0.3s ease'
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              gap: 1.5,
              justifyContent: 'space-between',
              ...(isMdUp ? { backgroundColor: '#FFFFFF' } : { backgroundColor: 'transparent' }),
              borderRadius: '8px',
              ...(isMdUp ? { mt: 3, mr: 3 } : { mt: 0, mr: 0 })
            }}
          >
            {isMdUp ? (
              <>
                {/* Desktop: breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  <Breadcrumbs
                    separator="/"
                    sx={{
                      flex: 1,
                      '& .MuiBreadcrumbs-separator': {
                        color: '#74767F',
                        mx: 1
                      }
                    }}
                  >
                    {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1;
                      return isLast ? (
                        <Typography
                          key={index}
                          color="text.primary"
                          sx={{ fontSize: '14px', letterSpacing: '0.17px' }}
                        >
                          {crumb.label}
                        </Typography>
                      ) : (
                        <Link
                          key={index}
                          component="button"
                          underline="hover"
                          color="text.secondary"
                          onClick={() => crumb.href && navigate(crumb.href)}
                          sx={{
                            fontSize: '14px',
                            letterSpacing: '0.17px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            p: 0
                          }}
                        >
                          {crumb.label}
                        </Link>
                      );
                    })}
                  </Breadcrumbs>
                ) : (
                  <Box sx={{ flex: 1 }} />
                )}

                {/* Desktop: user menu */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    onClick={handleUserMenuOpen}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8
                      }
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: '#8F6D5F',
                        width: 32,
                        height: 32,
                        fontSize: '14px',
                        fontWeight: 400,
                        borderRadius: '4px'
                      }}
                    >
                      {user?.name?.[0] ?? 'C'}
                    </Avatar>
                    <Typography
                      sx={{
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '0.15px',
                        color: '#32343A'
                      }}
                    >
                      Witaj!
                    </Typography>
                  </Box>

                  <UserMenu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    userName={user?.name}
                    companyName="Cliffside Brokers"
                    options={userMenuOptions || []}
                    onLogout={handleLogout}
                    loggingOut={loggingOut}
                  />
                </Stack>
              </>
            ) : (
              <>
                {/* Mobile: logo + bell + avatar */}
                <IconButton
                  component={NavLink}
                  to="/app/dashboard"
                  edge="start"
                  aria-label="Dashboard"
                  sx={{ p: 0, ml: '24px', mt: '16px', mb: '8px' }}
                >
                  <Box
                    component="img"
                    src={logoLight}
                    alt="Cliffside Brokers"
                    sx={{ width: 72, height: 'auto', userSelect: 'none' }}
                  />
                </IconButton>
                <Box flex={1} />
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton aria-label="Powiadomienia" sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
                          fill="#1E1F21"
                        />
                      </svg>
                    </Box>
                  </IconButton>
                  <IconButton onClick={toggleAccountDrawer} aria-label="Konto" sx={{ p: 0 }}>
                    <Avatar
                      sx={{
                        bgcolor: '#8F6D5F',
                        width: 40,
                        height: 40,
                        fontSize: '14px',
                        fontWeight: 400,
                        borderRadius: '4px'
                      }}
                    >
                      {user?.name?.[0] ?? 'C'}
                    </Avatar>
                  </IconButton>
                </Stack>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: { xs: 0, md: 4 },
            px: 0,
            ml: isMdUp ? `${currentSidebarWidth + 40}px` : 0,
            width: isMdUp ? `calc(100% - ${currentSidebarWidth + 40}px)` : '100%',
            transition: 'all 0.3s ease',
            // Mobile: fixed header (64px) + scrollable content + space for bottom nav (80px)
            ...(isMdUp
              ? { mt: 8, pb: 3 }
              : {
                  mt: '80px',
                  pb: '112px',
                  height: 'calc(100vh - 180px)',
                  overflowY: 'auto',
                  pt: '16px'
                })
          }}
        >
          {children}
        </Box>

        {/* Mobile Navigation */}
        <MobileNavigation />

        {/* Mobile Account Drawer (bottom sheet) */}
        {!isMdUp && (
          <Drawer
            anchor="bottom"
            open={accountDrawerOpen}
            onClose={toggleAccountDrawer}
            sx={{
              zIndex: (theme) => theme.zIndex.modal + 2000,
              '& .MuiDrawer-paper': {
                borderRadius: '20px 20px 0 0',
                backgroundColor: theme.palette.mode === 'light' ? '#FFFFFF' : '#1A1B1F',
                p: 0
              }
            }}
          >
            {/* Close button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton
                onClick={toggleAccountDrawer}
                sx={{
                  color: '#8E9098',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 24,
                    height: 24,
                    fontSize: 24,
                    lineHeight: 1
                  }}
                >
                  ✕
                </Box>
              </IconButton>
            </Box>

            {/* User info header */}
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography
                sx={{
                  fontSize: '20px',
                  fontWeight: 300,
                  lineHeight: '32px',
                  letterSpacing: '-0.4px',
                  color: '#32343A',
                  textAlign: 'center'
                }}
              >
                {user?.name ?? 'Gość'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: '1.66',
                  letterSpacing: '0.4px',
                  color: '#32343A',
                  textAlign: 'center'
                }}
              >
                Cliffside Bokers
              </Typography>
            </Box>

            {/* User menu options */}
            <Box sx={{ pb: 1 }}>
              {userMenuOptions?.map((option, index) => (
                <ListItemButton
                  key={index}
                  onClick={() => {
                    option.onClick?.();
                    setAccountDrawerOpen(false);
                  }}
                  sx={{
                    px: 2,
                    py: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: '#8E9098' }}>{option.icon}</ListItemIcon>
                  <ListItemText
                    primary={option.label}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '1.43',
                        letterSpacing: '0.17px',
                        color: '#32343A'
                      }
                    }}
                  />
                </ListItemButton>
              ))}
            </Box>

            <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.12)' }} />

            {/* Logout button */}
            <Box sx={{ py: 1 }}>
              <ListItemButton
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{
                  px: 2,
                  py: 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: '#8E9098' }}>
                  {loggingOut ? <CircularProgress size={20} /> : <LogoutRoundedIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={loggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
                  primaryTypographyProps={{
                    sx: {
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '1.43',
                      letterSpacing: '0.17px',
                      color: '#32343A'
                    }
                  }}
                />
              </ListItemButton>
            </Box>
          </Drawer>
        )}
      </Box>
    </Box>
  );
};

export default AppShell;
