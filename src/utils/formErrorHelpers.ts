import { type FieldErrors, type FieldPath, type FieldValues } from 'react-hook-form';

export interface MuiFieldErrorProps {
  error: boolean;
  helperText?: string;
}

/**
 * KeyDown handler that blocks any non-digit key input.
 * Allows: digits 0-9, Backspace, Delete, Arrow keys, Tab, Ctrl/Cmd shortcuts.
 */
export const onlyDigitsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  const allowed = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Tab',
    'Home',
    'End'
  ];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
};

export const translateServerError = (message: string): string => {
  const map: Record<string, string> = {
    'Invalid phone number': 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)',
    'The phone field must not be greater than 11 characters.':
      'Numer telefonu może mieć maksymalnie 11 cyfr',
    'The phone format is invalid.': 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)'
  };
  return map[message] ?? message;
};

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return undefined;
  }

  const { message } = error as { message?: unknown };

  return typeof message === 'string' ? message : undefined;
};

export const getMuiErrorProps = <TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  name: FieldPath<TFieldValues>
): MuiFieldErrorProps => {
  const fieldError = errors[name];
  const helperText = getErrorMessage(fieldError);

  return {
    error: Boolean(fieldError),
    helperText
  };
};
