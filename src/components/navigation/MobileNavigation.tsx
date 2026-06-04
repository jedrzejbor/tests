import { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  Stack,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { filterAccessibleItems, getMobileMenuItems, getMoreMenuItems } from '@/config/navigation';
import MoreIcon from '@/components/icons/MoreIcon';
import { usePermission } from '@/hooks/usePermission';

export const MobileNavigation: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission } = usePermission();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const mobileItems = filterAccessibleItems(getMobileMenuItems(), hasPermission);
  const moreItems = filterAccessibleItems(getMoreMenuItems(), hasPermission);
  const drawerItems = [...mobileItems, ...moreItems];

  // Find current route in mobile items
  const currentValue = mobileItems.find((item) => location.pathname === item.path)?.id || null;

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // const handleMoreClick = () => {
  //   setMoreDrawerOpen(true);
  // };

  const handleMoreItemClick = (path: string) => {
    handleNavigate(path);
    setMoreDrawerOpen(false);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <BottomNavigation
        showLabels
        value={moreDrawerOpen ? 'more' : currentValue}
        onChange={(_, newValue) => {
          // Toggle drawer when 'more' is clicked
          if (newValue === 'more') {
            setMoreDrawerOpen((open) => !open);
            return;
          }

          const item = mobileItems.find((i) => i.id === newValue);
          if (item) {
            // close the drawer (if open) and navigate
            setMoreDrawerOpen(false);
            handleNavigate(item.path);
          }
        }}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          p: '8px 16px',
          borderRadius: '16px 16px 0 0',
          bgcolor: '#1E1F21',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.modal + 10,
          '& .MuiBottomNavigationAction-root': {
            // distribute actions evenly across the bar
            flex: 1,
            minWidth: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-selected': {
              color: '#FFFFFF'
            }
          },
          // ensure img icons (like our Figma SVG) can be recolored when selected
          '& .MuiBottomNavigationAction-root img': {
            width: 24,
            height: 24,
            display: 'block'
          },
          '& .MuiBottomNavigationAction-root.Mui-selected img': {
            // convert icon to white using a filter when selected
            filter: 'brightness(0) invert(1)'
          },
          // ensure labels are visible (override MUI hiding behavior)
          '& .MuiBottomNavigationAction-label': {
            color: 'inherit',
            opacity: 1,
            transform: 'none',
            transition: 'none',
            mt: '16px',
            fontSize: '14px',
            fontWeight: 500
          }
        }}
      >
        {mobileItems.map((item) => {
          const IconComponent = item.icon as React.ElementType;
          return (
            <BottomNavigationAction
              key={item.id}
              label={item.label}
              value={item.id}
              icon={<IconComponent sx={{ fontSize: 24, width: 24, height: 24 }} />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: '#FFFFFF'
                },
                // ensure the label inherits the action color and increase gap
                '& .MuiBottomNavigationAction-label': {
                  color: 'inherit',
                  mt: '16px'
                }
              }}
            />
          );
        })}

        {/* "Więcej" (More) button if there are hidden items */}
        {moreItems.length > 0 && (
          <BottomNavigationAction
            label="Więcej"
            value="more"
            icon={<MoreIcon sx={{ fontSize: 24, width: 24, height: 24 }} />}
            sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-selected': { color: '#FFFFFF' } }}
          />
        )}
      </BottomNavigation>

      {/* "Więcej" Drawer */}
      <Drawer
        anchor="bottom"
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
        ModalProps={{
          // keep the backdrop from covering the bottom nav by shortening it
          BackdropProps: {
            sx: {
              bottom: '80px'
            }
          }
        }}
        sx={{
          '& .MuiDrawer-paper': {
            // position the drawer *above* the bottom nav bar (bar height = 80px)
            bottom: '80px',
            left: 0,
            right: 0,
            position: 'fixed',
            borderRadius: '16px 16px 0 0',
            backgroundColor: theme.palette.mode === 'light' ? '#FFFFFF' : '#1A1B1F',
            zIndex: (theme) => theme.zIndex.modal
          }
        }}
      >
        <Stack
          sx={{
            width: '100%',
            maxHeight: '70vh',
            overflow: 'auto',
            p: 2
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
            Więcej opcji
          </Typography>

          <List sx={{ width: '100%' }}>
            {drawerItems.map((item) => {
              const IconComponent = item.icon as React.ElementType;
              return (
                <ListItemButton
                  key={item.id}
                  onClick={() => handleMoreItemClick(item.path)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <IconComponent sx={{ fontSize: 24, width: 24, height: 24 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ sx: { fontSize: '14px', fontWeight: 500 } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Stack>
      </Drawer>
    </>
  );
};

export default MobileNavigation;
