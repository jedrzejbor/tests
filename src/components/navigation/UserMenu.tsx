import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import {
  Box,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import React from 'react';

export interface UserMenuOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface UserMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  userName?: string;
  companyName?: string;
  options: UserMenuOption[];
  onLogout: () => void;
  loggingOut?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  anchorEl,
  open,
  onClose,
  userName = 'Gość',
  companyName,
  options,
  onLogout,
  loggingOut = false
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right'
      }}
      PaperProps={{
        sx: {
          backgroundColor: '#FFFFFF',
          borderRadius: 2,
          minWidth: 240,
          mt: 1,
          boxShadow:
            '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12) !important'
        }
      }}
    >
      {/* User info header */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 300,
            lineHeight: 1.6,
            letterSpacing: '0.15px',
            color: '#32343A',
            textAlign: 'center'
          }}
        >
          {userName}
        </Typography>
        {companyName && (
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: 1.66,
              letterSpacing: '0.4px',
              color: '#32343A',
              textAlign: 'center',
              mt: 0.5
            }}
          >
            {companyName}
          </Typography>
        )}
      </Box>

      {/* Menu options */}
      {options.map((option, index) => (
        <MenuItem
          key={index}
          onClick={() => {
            onClose();
            option.onClick();
          }}
          disabled={option.disabled}
          sx={{
            px: 2,
            py: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#8E9098' }}>{option.icon}</ListItemIcon>
          <ListItemText
            primary={option.label}
            primaryTypographyProps={{
              sx: {
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: 1.43,
                letterSpacing: '0.17px',
                color: '#32343A'
              }
            }}
          />
        </MenuItem>
      ))}

      {/* Divider */}
      <Divider sx={{ my: 1, borderColor: 'rgba(0, 0, 0, 0.12)' }} />

      {/* Logout option */}
      <MenuItem
        onClick={() => {
          onClose();
          onLogout();
        }}
        disabled={loggingOut}
        sx={{
          px: 2,
          py: 1,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
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
              lineHeight: 1.43,
              letterSpacing: '0.17px',
              color: '#32343A'
            }
          }}
        />
      </MenuItem>
    </Menu>
  );
};

export default UserMenu;
