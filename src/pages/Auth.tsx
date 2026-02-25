import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { CompanyAutocomplete } from '@/components/auth/CompanyAutocomplete';
import { cn } from '@/lib/utils';

// ── Validation schemas ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(100, 'Name zu lang'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  companyName: z.string().min(2, 'Bitte geben Sie Ihr Unternehmen an'),
});

type AuthMode = 'login' | 'signup' | 'forgot-password';

// ── Figma input field style helper ───────────────────────────────────────────
// Spec (node 5:15986): white bg · #299F55 green border when focused/filled ·
// rounded-[4px] · p-[12px] · 16px regular · #2B2A28 text
function msdInputClass(error?: string, value?: string): string {
  return cn(
    // Base — Figma geometry
    'w-full bg-white rounded-[4px] px-3 py-3 h-12',
    'text-base text-[#2B2A28] placeholder:text-[#98A2B3]',
    // Remove shadcn ring in favour of Figma border
    'border focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
    'transition-colors duration-150',
    // Border colour by state
    error
      ? 'border-destructive focus:border-destructive'
      : value
        ? 'border-[#299F55] focus:border-[#299F55]'
        : 'border-[#D0D5DD] focus:border-[#299F55]',
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ email, password, fullName, companyName });
      } else {
        z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein').parse(email);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          } else {
            newErrors['email'] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(
            error.message.includes('Invalid login credentials')
              ? 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'
              : error.message,
          );
        } else {
          toast.success('Erfolgreich angemeldet');
          navigate(from, { replace: true });
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName, selectedCompanyId, companyName);
        if (error) {
          toast.error(
            error.message.includes('User already registered')
              ? 'Diese E-Mail-Adresse ist bereits registriert.'
              : error.message,
          );
        } else {
          setRegistrationSuccess(true);
          toast.success('Registrierung erfolgreich! Ihre Anfrage wird geprüft.');
        }
      } else if (mode === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(error.message);
        } else {
          setResetEmailSent(true);
          toast.success('E-Mail zum Zurücksetzen des Passworts wurde gesendet.');
        }
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared form label ────────────────────────────────────────────────────
  const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <Label
      htmlFor={htmlFor}
      className="text-sm font-medium text-[#344054] mb-1.5 block"
    >
      {children}
    </Label>
  );

  const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="mt-1.5 text-xs text-destructive">{message}</p> : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left side — desktop branding panel ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 animate-gradient flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-accent/10 animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-32 left-1/4 w-40 h-40 rounded-full bg-accent/5 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Package className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold text-primary-foreground">MS DIRECT</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/60">Fulfillment Hub</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="font-heading text-4xl font-bold text-primary-foreground leading-tight">
            Ihr Fulfillment.<br />
            Volle Transparenz.<br />
            <span className="text-accent">Jederzeit.</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            {mode === 'forgot-password'
              ? 'Fordern Sie einen Link zum Zurücksetzen Ihres Passworts an.'
              : 'Behalten Sie den Überblick über alle Ihre Bestellungen, Bestände und Retouren – in Echtzeit, an einem Ort.'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-primary-foreground/60">
          <span>© 2025 MS Direct</span>
          <span>•</span>
          <span>Datenschutz</span>
          <span>•</span>
          <span>Impressum</span>
        </div>
      </div>

      {/* ── Right side — auth form (full-width on mobile) ─────────────────── */}
      <div className="flex flex-1 flex-col min-h-screen bg-white">

        {/* Mobile header bar */}
        <div className="flex lg:hidden items-center gap-3 px-6 pt-12 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold text-foreground">MS DIRECT</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fulfillment Hub</span>
          </div>
        </div>

        {/* Form area — vertically centered on desktop, top-aligned with padding on mobile */}
        <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16">
          <div className="w-full max-w-sm mx-auto">

            {/* ── Registration success ── */}
            {registrationSuccess ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF3]">
                    <CheckCircle className="h-8 w-8 text-[#299F55]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#101828]">Registrierung erfolgreich!</h2>
                  <p className="mt-2 text-sm text-[#667085]">
                    Ihre Anfrage wurde eingereicht und wird von einem Administrator geprüft.
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#D0D5DD] bg-[#F9FAFB] p-4 text-left space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-[#667085]" />
                    <span className="text-[#667085]">Status: <span className="font-medium text-[#101828]">Ausstehend</span></span>
                  </div>
                  <p className="text-sm text-[#667085]">
                    Sie werden per E-Mail benachrichtigt, sobald Ihr Zugang freigeschaltet wurde.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setMode('login');
                    setEmail('');
                    setPassword('');
                    setFullName('');
                    setCompanyName('');
                  }}
                  className="w-full h-12 rounded-[4px] border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] hover:bg-[#F9FAFB] transition-colors"
                >
                  Zurück zur Anmeldung
                </button>
              </div>

            /* ── Password reset success ── */
            ) : resetEmailSent ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF3]">
                    <Mail className="h-8 w-8 text-[#299F55]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#101828]">E-Mail gesendet!</h2>
                  <p className="mt-2 text-sm text-[#667085]">
                    Wir haben Ihnen eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts gesendet.
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#D0D5DD] bg-[#F9FAFB] p-4 text-left">
                  <p className="text-sm text-[#667085]">
                    Bitte überprüfen Sie Ihren Posteingang und folgen Sie den Anweisungen in der E-Mail.
                  </p>
                </div>
                <button
                  onClick={() => { setResetEmailSent(false); setMode('login'); setEmail(''); }}
                  className="w-full h-12 rounded-[4px] border border-[#D0D5DD] bg-white text-sm font-medium text-[#344054] hover:bg-[#F9FAFB] transition-colors"
                >
                  Zurück zur Anmeldung
                </button>
              </div>

            /* ── Main form ── */
            ) : (
              <>
                {/* Heading */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#101828]">
                    {mode === 'login'
                      ? 'Willkommen zurück'
                      : mode === 'signup'
                        ? 'Konto erstellen'
                        : 'Passwort vergessen'}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#667085]">
                    {mode === 'login'
                      ? 'Melden Sie sich an, um fortzufahren'
                      : mode === 'signup'
                        ? 'Registrieren Sie sich für den Fulfillment Hub'
                        : 'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* ── Signup-only fields ── */}
                  {mode === 'signup' && (
                    <>
                      {/* Full name */}
                      <div>
                        <FieldLabel htmlFor="fullName">Vollständiger Name</FieldLabel>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#98A2B3]" />
                          <input
                            id="fullName"
                            type="text"
                            autoComplete="name"
                            placeholder="Max Mustermann"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                            }}
                            className={cn(msdInputClass(errors.fullName, fullName), 'pl-10')}
                          />
                        </div>
                        <FieldError message={errors.fullName} />
                      </div>

                      {/* Company autocomplete */}
                      <CompanyAutocomplete
                        value={companyName}
                        selectedCompanyId={selectedCompanyId}
                        onChange={(value) => {
                          setCompanyName(value);
                          if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' }));
                        }}
                        onSelect={(company) => setSelectedCompanyId(company?.id || null)}
                        error={errors.companyName}
                      />
                    </>
                  )}

                  {/* ── Email ── */}
                  <div>
                    <FieldLabel htmlFor="email">E-Mail-Adresse</FieldLabel>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#98A2B3]" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="name@unternehmen.ch"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                        }}
                        className={cn(msdInputClass(errors.email, email), 'pl-10')}
                      />
                    </div>
                    <FieldError message={errors.email} />
                  </div>

                  {/* ── Password ── */}
                  {mode !== 'forgot-password' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <FieldLabel htmlFor="password">Passwort</FieldLabel>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => { setMode('forgot-password'); setErrors({}); }}
                            className="text-xs font-medium text-[#299F55] hover:text-[#1d7a40] transition-colors"
                          >
                            Passwort vergessen?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#98A2B3]" />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                          }}
                          className={cn(msdInputClass(errors.password, password), 'pl-10 pr-11')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-[#98A2B3] hover:text-[#667085] transition-colors touch-manipulation"
                        >
                          {showPassword
                            ? <EyeOff className="h-[18px] w-[18px]" />
                            : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                      <FieldError message={errors.password} />
                    </div>
                  )}

                  {/* ── Submit ── */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-[4px] gap-2 text-base font-medium mt-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {mode === 'login' ? 'Anmelden' : mode === 'signup' ? 'Registrieren' : 'Link senden'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* ── Bottom nav link ── */}
                <div className="mt-6 text-center">
                  {mode === 'forgot-password' ? (
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrors({}); }}
                      className="text-sm text-[#667085] hover:text-[#344054] transition-colors"
                    >
                      <span className="font-medium text-[#299F55]">← Zurück zur Anmeldung</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setErrors({});
                        setRegistrationSuccess(false);
                      }}
                      className="text-sm text-[#667085] hover:text-[#344054] transition-colors"
                    >
                      {mode === 'login' ? (
                        <>Noch kein Konto?{' '}<span className="font-medium text-[#299F55]">Registrieren</span></>
                      ) : (
                        <>Bereits registriert?{' '}<span className="font-medium text-[#299F55]">Anmelden</span></>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>

        {/* Mobile footer */}
        <div className="flex lg:hidden justify-center gap-4 pb-8 text-xs text-[#98A2B3]">
          <span>© 2025 MS Direct</span>
          <span>•</span>
          <span>Datenschutz</span>
          <span>•</span>
          <span>Impressum</span>
        </div>
      </div>

    </div>
  );
}
