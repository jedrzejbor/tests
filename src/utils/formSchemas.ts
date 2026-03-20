import { z } from 'zod';

const emailField = z.string().min(1, '').email('Błędny adres email');

const passwordField = z
  .string()
  .min(1, 'Te pola nie mogą być puste')
  .min(8, 'Hasło musi mieć co najmniej 8 znaków');

export const loginSchema = z.object({
  email: emailField,
  password: passwordField
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    code: z.string().min(6, 'Kod resetujący powinien mieć co najmniej 6 znaków'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Potwierdź nowe hasło')
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Hasła muszą się zgadzać'
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane').min(2, 'Imię musi mieć co najmniej 2 znaki'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki'),
  email: emailField,
  phone: z
    .string()
    .min(1, 'Numer telefonu jest wymagany')
    .regex(/^[0-9]{1,11}$/, 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)'),
  currentPassword: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').optional()
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Account data edit form schema
export const editAccountDataSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane').min(2, 'Imię musi mieć co najmniej 2 znaki'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki'),
  email: emailField,
  phone: z
    .string()
    .min(1, 'Numer telefonu jest wymagany')
    .regex(/^[0-9]{1,11}$/, 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)')
});

export type EditAccountDataFormValues = z.infer<typeof editAccountDataSchema>;

// Change password form schema
export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField,
    confirmNewPassword: z.string().min(1, 'Potwierdź nowe hasło')
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Hasła muszą się zgadzać'
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Add User form schema
export const addUserSchema = z.object({
  // Dane użytkownika
  role: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz rolę w systemie')
  ),
  company: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz firmę')
  ),

  // Dane użytkownika
  firstName: z.string().min(1, 'Imię jest wymagane').min(2, 'Imię musi mieć co najmniej 2 znaki'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki'),
  position: z.string().optional(),
  competencies: z.array(z.number()).optional(),
  managingEntities: z.array(z.number()).optional(),
  dependentEntities: z.array(z.number()).optional(),
  phone: z
    .string()
    .min(1, 'Numer telefonu jest wymagany')
    .regex(/^[0-9]{1,11}$/, 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)'),
  email: emailField,
  accountType: z.string().min(1, 'Wybierz rodzaj konta'),
  status: z.string().min(1, 'Wybierz status użytkownika')
});

export type AddUserFormValues = z.input<typeof addUserSchema>;

// Edit User form schema (similar to addUser but with optional new password)
export const editUserSchema = z.object({
  // Dane użytkownika
  role: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz rolę w systemie')
  ),
  company: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz firmę')
  ),

  // Dane użytkownika
  firstName: z.string().min(1, 'Imię jest wymagane').min(2, 'Imię musi mieć co najmniej 2 znaki'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki'),
  position: z.string().optional(),
  competencies: z.array(z.number()).optional(),
  managingEntities: z.array(z.number()).optional(),
  dependentEntities: z.array(z.number()).optional(),
  phone: z
    .string()
    .min(1, 'Numer telefonu jest wymagany')
    .regex(/^[0-9]{1,11}$/, 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)'),
  email: emailField,
  marketingConsent: z.string().min(1, 'Wybierz zgodę marketingową'),
  accountType: z.string().min(1, 'Wybierz rodzaj konta'),
  status: z.string().min(1, 'Wybierz status użytkownika')
});

export type EditUserFormValues = z.input<typeof editUserSchema>;

// ================== CLIENT SCHEMAS ==================

const phoneOptional = z
  .string()
  .regex(/^[0-9]{1,11}$/, 'Podaj prawidłowy numer telefonu (tylko cyfry, max 11)')
  .or(z.literal(''))
  .optional();

/** NIP: exactly 10 digits */
const nipRegex = /^[0-9]{10}$/;
const nipMessage = 'NIP musi mieć dokładnie 10 cyfr';

const nipRequired = z.string().min(1, 'NIP jest wymagany').regex(nipRegex, nipMessage);

const nipOptional = z.string().regex(nipRegex, nipMessage).or(z.literal('')).optional();

const regonOptional = z
  .string()
  .regex(/^[0-9]{9,14}$/, 'REGON musi składać się z 9–14 cyfr')
  .or(z.literal(''))
  .optional();

const krsOptional = z
  .string()
  .regex(/^[0-9]{10}$/, 'KRS musi składać się z dokładnie 10 cyfr')
  .or(z.literal(''))
  .optional();

export const addClientSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  authority_scope: z.string().min(1, 'Wybierz zakres umocowania'),
  type: z.string().optional(),
  nip: nipRequired,
  regon: regonOptional,
  krs: krsOptional,
  website: z.string().optional(),
  bank_account: z.string().optional(),
  street: z.string().optional(),
  street_no: z.string().optional(),
  city: z.string().optional(),
  postal: z.string().optional(),
  phone: phoneOptional,
  status: z.string().min(1, 'Wybierz status klienta'),
  // Powiązania
  hasRelations: z.boolean(),
  parentClientId: z.number().optional(),
  childClientIds: z.array(z.number()).optional()
});

export type AddClientFormValues = z.input<typeof addClientSchema>;

export const editClientSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  authority_scope: z.string().min(1, 'Wybierz zakres umocowania'),
  type: z.string().optional(),
  nip: nipOptional,
  regon: regonOptional,
  krs: krsOptional,
  website: z.string().optional(),
  bank_account: z.string().optional(),
  street: z.string().optional(),
  street_no: z.string().optional(),
  city: z.string().optional(),
  postal: z.string().optional(),
  phone: phoneOptional,
  status: z.string().min(1, 'Wybierz status klienta'),
  // Powiązania
  hasRelations: z.boolean(),
  parentClientId: z.number().optional(),
  childClientIds: z.array(z.number()).optional()
});

export type EditClientFormValues = z.input<typeof editClientSchema>;
