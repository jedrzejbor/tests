import { Box, Container, Paper, Stack, useTheme, Typography } from '@mui/material';
// import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
// import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BrandLogo from '@/components/BrandLogo';
import backgroundImage from '@/assets/background-image.svg';
// import { useColorMode } from '@/theme';
import heroDesktop from '@/assets/hero-desktop.jpg';
import { useLocation, useSearchParams } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const theme = useTheme();
  // const { toggleColorMode, mode } = useColorMode();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isLight = theme.palette.mode === 'light';

  // Ukryj logo na stronach verify i reset-password (w tym gdy jest token w URL)
  const isResetPasswordWithToken =
    location.pathname === '/reset-password' && searchParams.has('token');
  const shouldHideLogo =
    location.pathname === '/verify' ||
    location.pathname === '/reset-password' ||
    isResetPasswordWithToken;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        position: 'relative',
        p: { xs: 0, lg: '20px' },
        bgcolor: { xs: 'transparent', lg: '#ffffff' }
      }}
    >
      {/* Desktop wrapper with rounded corners */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flex: 1,
          borderRadius: '24px',
          position: 'relative'
        }}
      >
        {/* Left side - Form */}
        <Box
          sx={{
            flex: '0 0 640px',
            minHeight: 'calc(100vh - 40px)',
            background: isLight
              ? 'linear-gradient(180deg, #FFFFFF 0%, #F5F3EF 100%)'
              : 'linear-gradient(180deg, #0E1117 0%, #0C0F14 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '56px 10px 37px 34px rgba(0, 0, 0, 0.2)',
            zIndex: 2,
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
            // Desktop only background image anchored to left edge
            backgroundImage: { xs: 'none', lg: `url(${backgroundImage})` },
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'left bottom',
            backgroundSize: { xs: 'auto', lg: 'auto 70%' }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              py: 5,
              pb: 1.75,
              px: 3
            }}
          >
            {/* Desktop: Logo at center top */}
            <Stack spacing={2} alignItems="center" sx={{ mb: 2, mt: 10 }}>
              {!shouldHideLogo && <BrandLogo size="md" variant="light" />}
            </Stack>

            {/* Form content - centered */}
            <Stack
              spacing={3}
              alignItems="center"
              justifyContent="flex-start"
              flex={1}
              sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}
            >
              <Paper
                variant="outlined"
                sx={{
                  width: '100%',
                  p: '32px 24px',
                  boxShadow: isLight
                    ? '0px 14px 46px rgba(23, 26, 31, 0.06)'
                    : '0px 14px 46px rgba(0, 0, 0, 0.48)'
                }}
              >
                {children}
              </Paper>

              {location.pathname === '/verify' && (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    p: 1.5,
                    borderRadius: '8px',
                    bgcolor: '#000000',
                    width: '100%'
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 18, color: '#8F6D5F' }} />
                  <Typography variant="caption" color="#ffffff" sx={{ fontSize: '12px' }}>
                    Potrzebujesz pomocy? Skontaktuj się z zespołem Cliffsidebrokers.
                  </Typography>
                </Stack>
              )}
            </Stack>

            {/* Footer section - at bottom */}
            <Box sx={{ mt: 'auto' }}>
              {/* Copyright - separate section at very bottom */}
              <Box
                sx={{
                  borderTop: 1,
                  borderColor: 'rgba(143, 109, 95, 0.12)',
                  pt: 1.5,
                  textAlign: 'center'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "'Source Sans Pro', sans-serif",
                    fontWeight: 400,
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontSize: '12px',
                    letterSpacing: '0.4px'
                  }}
                >
                  Copyright © 2024 Cliffsidebrokers
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Right side - Hero Image (Desktop only) */}
        <Box
          sx={{
            flex: 1,
            minHeight: 'calc(100vh - 40px)',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: '#1E1F21',
            borderTopRightRadius: '24px',
            borderBottomRightRadius: '24px'
          }}
        >
          <Box
            component="img"
            src={heroDesktop}
            alt="Cliffside Brokers"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        </Box>
      </Box>

      {/* Mobile Layout */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          flex: 1,
          minHeight: '100vh',
          background: isLight
            ? 'linear-gradient(180deg, #FFFFFF 0%, #F5F3EF 100%)'
            : 'linear-gradient(180deg, #0E1117 0%, #0C0F14 100%)',
          flexDirection: 'column'
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            py: 4,
            px: 2,
            flex: 1
          }}
        >
          {/* Logo at top - only on mobile */}
          <Stack spacing={2} alignItems="center" sx={{ mb: 4 }}>
            {!shouldHideLogo && <BrandLogo size="lg" variant="light" />}
          </Stack>

          {/* Theme toggle - mobile */}
          {/* {location.pathname !== '/reset-password' && location.pathname !== '/set-new-password' && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <IconButton
                aria-label="Przełącz motyw"
                onClick={toggleColorMode}
                color="inherit"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
                {mode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
              </IconButton>
            </Stack>
          )} */}

          {/* Form content - centered vertically */}
          <Stack
            spacing={3}
            alignItems="center"
            justifyContent="center"
            flex={1}
            sx={{ width: '100%' }}
          >
            <Paper
              variant="outlined"
              sx={{
                width: '100%',
                p: '32px 16px',
                boxShadow: isLight
                  ? '0px 14px 46px rgba(23, 26, 31, 0.06)'
                  : '0px 14px 46px rgba(0, 0, 0, 0.48)'
              }}
            >
              {children}
            </Paper>

            {location.pathname === '/verify' && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  bgcolor: '#000000',
                  width: '100%'
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, color: '#8F6D5F' }} />
                <Typography variant="caption" color="#ffffff" sx={{ fontSize: '12px' }}>
                  Potrzebujesz pomocy? Skontaktuj się z zespołem Cliffsidebrokers.
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Copyright - mobile */}
          <Box
            sx={{
              borderTop: 1,
              borderColor: 'rgba(143, 109, 95, 0.12)',
              pt: 1.5,
              mt: 3,
              textAlign: 'center'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: "'Source Sans Pro', sans-serif",
                fontWeight: 400,
                color: 'rgba(0, 0, 0, 0.87)',
                fontSize: '14px',
                letterSpacing: '0.4px'
              }}
            >
              Copyright © 2024 Cliffsidebrokers
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthLayout;
