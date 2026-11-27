import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, Play } from 'lucide-react';
import { ApiClientError } from '../api';
import { Button, Card, ErrorBanner, LoadingSpinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveRedirectPath(state: LocationState | null): string {
  const from = state?.from;
  if (!from?.pathname) {
    return '/dashboard';
  }
  const combined = `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
  return combined.startsWith('/login') ? '/dashboard' : combined;
}

export function LoginPage() {
  const { isAuthenticated, isInitializing, login, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const redirectTo = resolveRedirectPath((location.state as LocationState | null) ?? null);

  if (isInitializing) {
    return <LoadingSpinner fullScreen label="Restoring your CallFlow session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const validate = (rawEmail: string, rawPassword: string): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    const trimmedEmail = rawEmail.trim();

    if (!trimmedEmail) {
      errors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Email must be valid';
    }

    if (!rawPassword) {
      errors.password = 'Password is required';
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validate(email, password);
    if (validationErrors.email || validationErrors.password) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiClientError) {
        const mappedErrors: LoginFieldErrors = {};
        for (const item of error.fieldErrors) {
          if (item.field === 'email' && !mappedErrors.email) {
            mappedErrors.email = item.message;
          } else if (item.field === 'password' && !mappedErrors.password) {
            mappedErrors.password = item.message;
          }
        }
        setFieldErrors(mappedErrors);
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <Phone className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to CallFlow</h1>
          <p className="mt-1 text-sm text-slate-500">
            Access your customer support queue, call records, and live metrics.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {formError && <ErrorBanner title="Sign-in failed" message={formError} />}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Work Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  placeholder="agent@callflow.local"
                  className={`block w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs font-medium text-rose-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  placeholder="Enter your password"
                  className={`block w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs font-medium text-rose-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full py-2.5">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="mb-3 text-center text-xs text-slate-500">
              No credentials or backend running? Explore with interactive sample data:
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full py-2.5"
              onClick={() => {
                enterDemoMode();
                navigate(redirectTo, { replace: true });
              }}
            >
              <Play className="h-3.5 w-3.5 fill-current text-brand-600" />
              Try Demo Console
            </Button>
          </div>
        </Card>

        <div className="space-y-2 text-center text-xs text-slate-500">
          <p>
            Authenticated sessions use CallFlow JWT bearer tokens for agent and administrator access.
          </p>
          <p>
            <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
              ← Back to CallFlow overview
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
