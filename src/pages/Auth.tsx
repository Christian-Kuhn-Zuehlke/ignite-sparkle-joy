import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Mail, Lock, User, ArrowRight, Loader2, Clock, CheckCircle, Eye, EyeOff } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { CompanyAutocomplete } from '@/components/auth/CompanyAutocomplete';

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
    if (user) {
      navigate(from, { replace: true });
    }
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
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Erfolgreich angemeldet');
          navigate(from, { replace: true });
        }
      } else if (mode === 'signup') {
        // Pass selectedCompanyId if user selected an existing company
        const { error } = await signUp(email, password, fullName, selectedCompanyId, companyName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Diese E-Mail-Adresse ist bereits registriert.');
          } else {
            toast.error(error.message);
          }
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
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified registration - no company selection needed
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding with Animated Gradient */}
      <div className="hidden lg:flex lg:w-1/2 animate-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Floating decorative elements */}
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
            <span className="font-heading text-lg font-bold text-primary-foreground">
              MS DIRECT
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/60">
              Fulfillment Hub
            </span>
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
              : 'Behalten Sie den Überblick über alle Ihre Bestellungen, Bestände und Retouren – in Echtzeit, an einem Ort.'
            }
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

      {/* Right Side - Auth Form */}
      <div className="flex flex-1 flex-col justify-center px-8 lg:px-16 bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold text-foreground">
                MS DIRECT
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Fulfillment Hub
              </span>
            </div>
          </div>

          {registrationSuccess ? (
            // Success state after registration
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Registrierung erfolgreich!
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Ihre Anfrage wurde eingereicht und wird von einem Administrator geprüft.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status: <span className="font-medium text-foreground">Ausstehend</span></span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sie werden per E-Mail benachrichtigt, sobald Ihr Zugang freigeschaltet wurde.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setRegistrationSuccess(false);
                  setMode('login');
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setCompanyName('');
                }}
                className="w-full"
              >
                Zurück zur Anmeldung
              </Button>
            </div>
          ) : resetEmailSent ? (
            // Success state after password reset request
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  E-Mail gesendet!
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Wir haben Ihnen eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts gesendet.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm text-muted-foreground">
                  Bitte überprüfen Sie Ihren Posteingang und folgen Sie den Anweisungen in der E-Mail.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setResetEmailSent(false);
                  setMode('login');
                  setEmail('');
                }}
                className="w-full"
              >
                Zurück zur Anmeldung
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {mode === 'login' ? 'Willkommen zurück' : mode === 'signup' ? 'Konto erstellen' : 'Passwort vergessen'}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {mode === 'login' 
                    ? 'Melden Sie sich an, um fortzufahren'
                    : mode === 'signup' 
                    ? 'Registrieren Sie sich für den Fulfillment Hub'
                    : 'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Vollständiger Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Max Mustermann"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                          }}
                          className="pl-10"
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-xs text-destructive">{errors.fullName}</p>
                      )}
                    </div>

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

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@unternehmen.ch"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                {mode !== 'forgot-password' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Passwort</Label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot-password');
                            setErrors({});
                          }}
                          className="text-xs text-accent hover:underline"
                        >
                          Passwort vergessen?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                        }}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 touch-manipulation"
                        aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isLoading}
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

              <div className="mt-6 text-center space-y-2">
                {mode === 'forgot-password' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="font-medium text-accent">← Zurück zur Anmeldung</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setErrors({});
                      setRegistrationSuccess(false);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {mode === 'login' ? (
                      <>
                        Noch kein Konto?{' '}
                        <span className="font-medium text-accent">Registrieren</span>
                      </>
                    ) : (
                      <>
                        Bereits registriert?{' '}
                        <span className="font-medium text-accent">Anmelden</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
