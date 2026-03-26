import { useEffect, useState } from 'react';
import { Fade } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginForm from '@/components/forms/LoginForm';
import ForgotPasswordForm from '@/components/forms/ForgotPasswordForm';
import PasswordResetSent from '@/components/forms/PasswordResetSent';
import ResetPasswordPlaceholder from '@/components/forms/ResetPasswordPlaceholder';
import UnavailableFeatureModal from '@/components/modals/UnavailableFeatureModal';
import { useColorMode } from '@/theme';

export interface LoginPageProps {
  initialStage?: 'login' | 'forgot' | 'sent' | 'reset';
  /** When true, the set-password form shows "Ustaw hasło dla konta" */
  isNewAccount?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialStage = 'login',
  isNewAccount = false
}) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Jeśli URL zawiera token i email, pokaż formularz ustawiania nowego hasła
  const computedInitialStage = token && email ? 'reset' : initialStage;

  const [stage, setStage] = useState<'login' | 'forgot' | 'sent' | 'reset'>(computedInitialStage);
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const { mode } = useColorMode();
  const navigate = useNavigate();

  useEffect(() => {
    // Jeśli URL zawiera token i email, zawsze pokaż formularz reset
    if (token && email) {
      setStage('reset');
    } else {
      setStage(initialStage);
    }
  }, [initialStage, token, email]);

  // Po udanym logowaniu (krok 1) przekieruj do strony 2FA
  const handleLoginSuccess = () => {
    navigate('/verify', { replace: true });
  };

  // Przejście do formularza "Nie pamiętam hasła"
  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  // Po wysłaniu emaila z resetem hasła
  const handlePasswordResetSent = () => {
    setStage('sent');
  };

  // Powrót do logowania
  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Po ustawieniu nowego hasła
  const handlePasswordResetComplete = () => {
    navigate('/login');
  };

  return (
    <>
      <Fade in key={stage + mode} timeout={300}>
        <div>
          {stage === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={handleForgotPassword}
              onBecomeClient={() => setUnavailableModalOpen(true)}
              onLinkClick={() => setUnavailableModalOpen(true)}
            />
          )}
          {stage === 'forgot' && (
            <ForgotPasswordForm
              onBackToLogin={handleBackToLogin}
              onProceed={handlePasswordResetSent}
            />
          )}
          {stage === 'sent' && <PasswordResetSent onBackToLogin={handleBackToLogin} />}
          {stage === 'reset' && (
            <ResetPasswordPlaceholder
              onBack={handleBackToLogin}
              onSuccess={handlePasswordResetComplete}
              isNewAccount={isNewAccount}
            />
          )}
        </div>
      </Fade>
      <UnavailableFeatureModal
        open={unavailableModalOpen}
        onClose={() => setUnavailableModalOpen(false)}
      />
    </>
  );
};

export default LoginPage;
