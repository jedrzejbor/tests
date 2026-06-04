import { PaletteMode, ThemeOptions, createTheme } from '@mui/material/styles';

const brandPalette = {
  primary: {
    main: '#1E1F21',
    light: '#1D1F27',
    dark: '#0A0B0F',
    contrastText: '#F7F5F2'
  },
  secondary: {
    // main: '#A77D67'
    main: '#8F6D5F',
    light: '#C39E8E',
    dark: '#8B6452',
    contrastText: '#FFFFFF'
  },
  info: {
    main: '#4C91E5',
    light: '#8CB8F0',
    dark: '#2C6EB8'
  },
  success: {
    main: '#25B776',
    light: '#6DD9A8',
    dark: '#18895A'
  },
  warning: {
    main: '#DFA048',
    light: '#F0C37F',
    dark: '#B97D2B'
  },
  error: {
    main: '#E86B6B',
    light: '#F29A9A',
    dark: '#BC4E4E'
  }
} satisfies ThemeOptions['palette'];

const typography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 300, letterSpacing: '0px', fontSize: '64px', lineHeight: '80px' },
  h2: { fontWeight: 300, letterSpacing: '-0.5px', fontSize: '56px', lineHeight: '120px' },
  h3: { fontWeight: 300, letterSpacing: '0px', fontSize: '48px' },
  h4: { fontWeight: 300, letterSpacing: '0px', fontSize: '32px' },
  h5: { fontWeight: 300, letterSpacing: '0.25px', fontSize: '24px' },
  h6: { fontWeight: 300, letterSpacing: '0.15px', fontSize: '20px', color: '#32343A' },
  subtitle1: { fontWeight: 400, fontSize: '16px', letterSpacing: '0.15px' },
  subtitle2: { fontWeight: 500, fontSize: '14px', letterSpacing: '0.1px' },
  body1: { fontWeight: 400, fontSize: '16px', letterSpacing: '0.15px' },
  body2: { fontWeight: 400, fontSize: '14px', letterSpacing: '0.17px' },
  body3: { fontWeight: 400, fontSize: '12px', letterSpacing: '0.4px' },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' }
};

const shape: ThemeOptions['shape'] = {
  borderRadius: 8
};

const spacing = 8;

const commonComponents: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        paddingInline: spacing * 2,
        paddingBlock: spacing * 1.25,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none'
        }
      },
      outlined: {
        // ensure outlined variant uses the design border color
        borderColor: '#D0D5DD',
        '&:hover': {
          borderColor: '#D0D5DD'
        }
      },
      contained: {
        '&.MuiButton-containedSecondary': {
          color: '#FFFFFF'
        },
        '&.Mui-disabled': {
          backgroundColor: '#8F6D5F',
          color: '#FFFFFF',
          opacity: 0.5
        }
      }
    }
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        backgroundImage: 'none',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none !important'
      }
    }
  },
  MuiPopover: {
    styleOverrides: {
      root: ({ theme }) => ({
        zIndex: theme.zIndex.modal + 300
      })
    }
  },
  MuiPopper: {
    styleOverrides: {
      root: ({ theme }) => ({
        zIndex: theme.zIndex.modal + 300
      })
    }
  },
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: 'var(--mui-palette-background-default)',
        color: 'var(--mui-palette-text-primary)'
      },
      a: {
        color: 'inherit',
        textDecoration: 'none'
      },
      '::selection': {
        backgroundColor: '#E5EDFF'
      }
    }
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined'
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          // borderRadius: shape.borderRadius - 2,
          borderRadius: 3,
          backgroundColor: 'var(--mui-palette-background-paper)',
          '& fieldset': {
            borderColor: '#D0D5DD'
          },
          '&:hover fieldset': {
            borderColor: '#D0D5DD'
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1.5
          }
        }
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderColor: 'var(--mui-palette-divider)'
      }
    }
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: 'var(--mui-palette-divider)'
      }
    }
  },
  MuiLink: {
    defaultProps: {
      underline: 'hover'
    }
  }
};

export const buildTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...brandPalette,
      background:
        mode === 'light'
          ? { default: '#E7E8EB', paper: '#FFFFFF' }
          : { default: '#1E1F21', paper: '#FFFFFF' },
      text:
        mode === 'light'
          ? { primary: '#1A1C22', secondary: '#4C5563' }
          : { primary: '#1E1F21', secondary: '#32343A' },
      divider: mode === 'light' ? '#E5E0DA' : '#252C38'
    },
    typography,
    shape,
    spacing,
    components: {
      ...commonComponents
    }
  });
