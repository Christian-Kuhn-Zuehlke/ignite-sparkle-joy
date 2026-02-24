import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, ArrowRight, Loader2, CheckCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If no session, user probably accessed page directly without reset link
    if (!session) {
      toast.error('Kein gültiger Reset-Link. Bitte fordern Sie einen neuen an.');
      navigate('/auth');
    }
  }, [session, navigate]);

  const validateForm = () => {
    try {
      passwordSchema.parse({ password, confirmPassword });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
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
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Passwort erfolgreich geändert');
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
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
            Neues Passwort<br />
            festlegen
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Geben Sie Ihr neues Passwort ein, um den Zugang zu Ihrem Konto wiederherzustellen.
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

      {/* Right Side - Form */}
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

          {success ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Passwort geändert!
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Ihr Passwort wurde erfolgreich aktualisiert.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full gap-2"
              >
                Zum Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Neues Passwort festlegen
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Geben Sie Ihr neues Passwort ein
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Passwort ändern
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
