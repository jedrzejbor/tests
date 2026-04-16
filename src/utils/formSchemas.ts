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
export const addUserSchema = z
  .object({
    // Dane użytkownika
    role: z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number().int().min(1, 'Wybierz rolę w systemie')
    ),
    company: z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number().int().min(1, 'Wybierz firmę').optional()
    ),
    // Flag injected at validation time — true when selected role doesn’t require a company
    _companyNotRequired: z.boolean().optional(),

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
    status: z.string().min(1, 'Wybierz status użytkownika')
  })
  .superRefine((data, ctx) => {
    if (!data._companyNotRequired && !data.company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wybierz firmę',
        path: ['company']
      });
    }
  });

export type AddUserFormValues = z.input<typeof addUserSchema>;

// Edit User form schema (similar to addUser but with optional new password)
export const editUserSchema = z
  .object({
    // Dane użytkownika
    role: z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number().int().min(1, 'Wybierz rolę w systemie')
    ),
    company: z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number().int().min(1, 'Wybierz firmę').optional()
    ),
    // Flag injected at validation time — true when selected role doesn’t require a company
    _companyNotRequired: z.boolean().optional(),

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
    status: z.string().min(1, 'Wybierz status użytkownika')
  })
  .superRefine((data, ctx) => {
    if (!data._companyNotRequired && !data.company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wybierz firmę',
        path: ['company']
      });
    }
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

// ================== DOCUMENT SCHEMAS ==================

const ALLOWED_DOC_EXTENSIONS = [
  'doc',
  'docx',
  'pdf',
  'xlsx',
  'xls',
  'zip',
  'rar',
  '7z',
  'gz',
  'tar',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff'
];
const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35 MB

const fileValidator = z
  .instanceof(File, { message: 'Załącznik jest wymagany' })
  .refine((f) => f.size <= MAX_FILE_SIZE, 'Plik nie może przekraczać 35 MB')
  .refine(
    (f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ALLOWED_DOC_EXTENSIONS.includes(ext);
    },
    `Dozwolone typy: ${ALLOWED_DOC_EXTENSIONS.join(', ')}`
  );

const optionalFileValidator = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, 'Plik nie może przekraczać 35 MB')
  .refine(
    (f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ALLOWED_DOC_EXTENSIONS.includes(ext);
    },
    `Dozwolone typy: ${ALLOWED_DOC_EXTENSIONS.join(', ')}`
  )
  .optional();

export const addDocumentSchema = z.object({
  name: z.string().min(1, 'Nazwa dokumentu jest wymagana'),
  description: z.string().optional(),
  date: z.string().min(1, 'Data dokumentu jest wymagana'),
  attachment: fileValidator
});

export type AddDocumentFormValues = z.input<typeof addDocumentSchema>;

export const editDocumentSchema = z
  .object({
    name: z.string().min(1, 'Nazwa dokumentu jest wymagana'),
    description: z.string().optional(),
    date: z.string().min(1, 'Data dokumentu jest wymagana'),
    keepExistingFile: z.boolean().optional(),
    newFile: optionalFileValidator
  })
  .superRefine((data, ctx) => {
    // Attachment is always required — if the existing file was removed a new one must be provided
    if (!data.keepExistingFile && !data.newFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newFile'],
        message: 'Załącznik jest wymagany — wybierz plik'
      });
    }
  });

export type EditDocumentFormValues = z.input<typeof editDocumentSchema>;

// ================== PAYMENT SCHEMAS ==================

export const addPaymentSchema = z.object({
  insurance_company_id: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz ubezpieczyciela')
  ),
  policy_id: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz polisę')
  ),
  payment_date: z.string().min(1, 'Data przelewu jest wymagana'),
  payment_total: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().min(0, 'Kwota musi być większa lub równa 0')
  ),
  margin_percent: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().min(0, 'Wartość od 0 do 100').max(100, 'Wartość od 0 do 100')
  ),
  status: z.string().min(1, 'Wybierz status płatności')
});

export type AddPaymentFormValues = z.input<typeof addPaymentSchema>;

export const editPaymentSchema = z.object({
  insurance_company_id: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz ubezpieczyciela')
  ),
  policy_id: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().int().min(1, 'Wybierz polisę')
  ),
  payment_date: z.string().min(1, 'Data przelewu jest wymagana'),
  payment_total: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().min(0, 'Kwota musi być większa lub równa 0')
  ),
  margin_percent: z.preprocess(
    (value) => (value === '' || value === null ? undefined : Number(value)),
    z.number().min(0, 'Wartość od 0 do 100').max(100, 'Wartość od 0 do 100')
  ),
  status: z.string().min(1, 'Wybierz status płatności')
});

export type EditPaymentFormValues = z.input<typeof editPaymentSchema>;

// ================== POLICY SCHEMAS ==================

const ALLOWED_POLICY_EXTENSIONS = [
  'doc',
  'docx',
  'pdf',
  'xlsx',
  'xls',
  'zip',
  'rar',
  '7z',
  'gz',
  'tar',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff'
];
const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const policyFileValidator = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_POLICY_FILE_SIZE, 'Plik nie może przekraczać 10 MB')
  .refine(
    (f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ALLOWED_POLICY_EXTENSIONS.includes(ext);
    },
    `Dozwolone typy: ${ALLOWED_POLICY_EXTENSIONS.join(', ')}`
  )
  .optional()
  .nullable();

const numberPreprocess = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

/** Single instalment (rata) */
const paymentDetailSchema = z.object({
  id: z.number().int().optional(),
  /** Amount displayed in PLN (e.g. "1200.00") — converted to grosze before submit */
  amount: z.preprocess(numberPreprocess, z.number().min(1, 'Kwota raty jest wymagana')),
  payment_date: z.string().min(1, 'Data raty jest wymagana')
});

export const addPolicySchema = z
  .object({
    // Step 1 — basic data
    client_id: z.preprocess(numberPreprocess, z.number().int().min(1, 'Wybierz klienta')),
    insurance_company_id: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Wybierz ubezpieczyciela')
    ),
    bank_name: z.string().min(1, 'Nazwa banku jest wymagana'),
    bank_account_number: z.string().min(1, 'Numer konta jest wymagany'),
    description: z.string().optional().nullable(),

    // Step 2 — policy details
    policy_type_id: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Wybierz rodzaj polisy')
    ),
    car_plates: z.string().optional().nullable(),
    number: z.string().min(1, 'Numer polisy jest wymagany').max(255),
    date_signed_at: z.string().min(1, 'Data zawarcia jest wymagana'),
    date_from: z.string().min(1, 'Początek obowiązywania jest wymagany'),
    date_to: z.string().min(1, 'Koniec obowiązywania jest wymagany'),
    city: z.string().min(1, 'Miasto jest wymagane'),

    // Step 3 — payment details
    /** Total premium in PLN (display) — converted to grosze before submit */
    payment_total: z.preprocess(
      numberPreprocess,
      z
        .number()
        .min(1, 'Wysokość składki jest wymagana')
        .max(10_000_000, 'Maksymalna kwota to 10 000 000 PLN')
    ),
    margin_percent: z.preprocess(
      numberPreprocess,
      z.number().min(0, 'Wartość od 0 do 100').max(100, 'Wartość od 0 do 100')
    ),
    payments_count: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Minimalna liczba rat to 1')
    ),
    payment_details: z.array(paymentDetailSchema).min(1, 'Dodaj przynajmniej jedną ratę'),

    // Clauses
    first_update_clause_of_su: z.boolean(),
    automatic_coverage_clause: z.boolean(),
    current_assets_settlement_clause: z.boolean(),

    // Attachment
    attachment: policyFileValidator
  })
  .refine((data) => !data.date_to || !data.date_from || data.date_to >= data.date_from, {
    path: ['date_to'],
    message: 'Koniec obowiązywania musi być po początku'
  })
  .superRefine((data, ctx) => {
    // ── Sum of instalments must not exceed payment_total ──
    if (
      typeof data.payment_total === 'number' &&
      Array.isArray(data.payment_details) &&
      data.payment_details.length > 0
    ) {
      const total = data.payment_total;
      const sum = data.payment_details.reduce((acc: number, d: { amount?: number }) => {
        return acc + (typeof d.amount === 'number' ? d.amount : 0);
      }, 0);

      // Round to avoid floating-point issues
      if (Math.round(sum * 100) > Math.round(total * 100)) {
        data.payment_details.forEach((_: unknown, i: number) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['payment_details', i, 'amount'],
            message: `Suma rat (${sum.toFixed(2)} PLN) przekracza wysokość składki (${total.toFixed(2)} PLN)`
          });
        });
      }
    }

    // ── Each subsequent payment_date must be >= the previous one ──
    if (Array.isArray(data.payment_details) && data.payment_details.length > 1) {
      for (let i = 1; i < data.payment_details.length; i++) {
        const prev = data.payment_details[i - 1]?.payment_date;
        const curr = data.payment_details[i]?.payment_date;
        if (prev && curr && curr < prev) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['payment_details', i, 'payment_date'],
            message: 'Data musi być równa lub późniejsza niż poprzednia rata'
          });
        }
      }
    }
  });

export type AddPolicyFormValues = z.input<typeof addPolicySchema>;

export const editPolicySchema = z
  .object({
    client_id: z.preprocess(numberPreprocess, z.number().int().min(1, 'Wybierz klienta')),
    insurance_company_id: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Wybierz ubezpieczyciela')
    ),
    bank_name: z.string().min(1, 'Nazwa banku jest wymagana'),
    bank_account_number: z.string().min(1, 'Numer konta jest wymagany'),
    description: z.string().optional().nullable(),

    policy_type_id: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Wybierz rodzaj polisy')
    ),
    car_plates: z.string().optional().nullable(),
    number: z.string().min(1, 'Numer polisy jest wymagany').max(255),
    date_signed_at: z.string().min(1, 'Data zawarcia jest wymagana'),
    date_from: z.string().min(1, 'Początek obowiązywania jest wymagany'),
    date_to: z.string().min(1, 'Koniec obowiązywania jest wymagany'),
    city: z.string().min(1, 'Miasto jest wymagane'),

    payment_total: z.preprocess(
      numberPreprocess,
      z
        .number()
        .min(1, 'Wysokość składki jest wymagana')
        .max(10_000_000, 'Maksymalna kwota to 10 000 000 PLN')
    ),
    margin_percent: z.preprocess(
      numberPreprocess,
      z.number().min(0, 'Wartość od 0 do 100').max(100, 'Wartość od 0 do 100')
    ),
    payments_count: z.preprocess(
      numberPreprocess,
      z.number().int().min(1, 'Minimalna liczba rat to 1')
    ),
    payment_details: z.array(paymentDetailSchema).min(1, 'Dodaj przynajmniej jedną ratę'),

    first_update_clause_of_su: z.boolean(),
    automatic_coverage_clause: z.boolean(),
    current_assets_settlement_clause: z.boolean(),

    attachment: policyFileValidator,
    /** Keep existing attachment (edit mode) */
    keepExistingAttachment: z.boolean().optional()
  })
  .refine((data) => !data.date_to || !data.date_from || data.date_to >= data.date_from, {
    path: ['date_to'],
    message: 'Koniec obowiązywania musi być po początku'
  })
  .superRefine((data, ctx) => {
    // ── Sum of instalments must not exceed payment_total ──
    if (
      typeof data.payment_total === 'number' &&
      Array.isArray(data.payment_details) &&
      data.payment_details.length > 0
    ) {
      const total = data.payment_total;
      const sum = data.payment_details.reduce((acc: number, d: { amount?: number }) => {
        return acc + (typeof d.amount === 'number' ? d.amount : 0);
      }, 0);

      if (Math.round(sum * 100) > Math.round(total * 100)) {
        data.payment_details.forEach((_: unknown, i: number) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['payment_details', i, 'amount'],
            message: `Suma rat (${sum.toFixed(2)} PLN) przekracza wysokość składki (${total.toFixed(2)} PLN)`
          });
        });
      }
    }

    // ── Each subsequent payment_date must be >= the previous one ──
    if (Array.isArray(data.payment_details) && data.payment_details.length > 1) {
      for (let i = 1; i < data.payment_details.length; i++) {
        const prev = data.payment_details[i - 1]?.payment_date;
        const curr = data.payment_details[i]?.payment_date;
        if (prev && curr && curr < prev) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['payment_details', i, 'payment_date'],
            message: 'Data musi być równa lub późniejsza niż poprzednia rata'
          });
        }
      }
    }
  });

export type EditPolicyFormValues = z.input<typeof editPolicySchema>;
