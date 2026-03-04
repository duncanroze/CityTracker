'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'login' | 'signup';
type View = 'form' | 'verifying';

interface AuthModalProps {
  onClose: () => void;
  initialTab?: Tab;
}

const RESEND_COOLDOWN_SECONDS = 60;

export default function AuthModal({ onClose, initialTab = 'login' }: AuthModalProps) {
  const { login, signup, verifyCode, resendCode } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [view, setView] = useState<View>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification code state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const reset = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError('');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  const goToVerification = (emailForVerification: string) => {
    setVerifyEmail(emailForVerification);
    setCodeDigits(['', '', '', '', '', '']);
    setError('');
    setView('verifying');
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    // Focus first input after render
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        const result = await login(email, password);
        if (result.pendingVerification && result.email) {
          goToVerification(result.email);
        } else {
          onClose();
        }
      } else {
        const result = await signup(email, password, displayName || undefined);
        if (result.pendingVerification && result.email) {
          goToVerification(result.email);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = useCallback((index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1);
    setCodeDigits(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setCodeDigits(prev => {
        if (!prev[index] && index > 0) {
          setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
        }
        return prev;
      });
    }
  }, []);

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    setCodeDigits(prev => {
      const newDigits = [...prev];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newDigits[i] = pasted[i];
      }
      // Focus the next empty input or last filled
      const nextEmpty = newDigits.findIndex(d => !d);
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
      setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
      return newDigits;
    });
  }, []);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join('');
    if (code.length !== 6) {
      setError('Entrez les 6 chiffres');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await verifyCode(verifyEmail, code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de vérification');
      // Clear digits on error
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await resendCode(verifyEmail);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  };

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (view === 'verifying' && codeDigits.every(d => d) && !submitting) {
      const code = codeDigits.join('');
      if (code.length === 6) {
        setError('');
        setSubmitting(true);
        verifyCode(verifyEmail, code)
          .then(() => onClose())
          .catch(err => {
            setError(err instanceof Error ? err.message : 'Erreur de vérification');
            setCodeDigits(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
          })
          .finally(() => setSubmitting(false));
      }
    }
  }, [codeDigits, view, verifyEmail, verifyCode, onClose, submitting]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={view === 'form' ? 'Authentification' : 'Vérification par email'}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 rounded-xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {view === 'form' ? (
          <>
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex gap-1">
                <button
                  onClick={() => switchTab('login')}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    tab === 'login' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Connexion
                </button>
                <button
                  onClick={() => switchTab('signup')}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    tab === 'signup' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Inscription
                </button>
              </div>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-displayname" className="text-xs font-medium text-muted-foreground">Nom (optionnel)</label>
                  <input
                    id="auth-displayname"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Votre nom"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                    maxLength={50}
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground">Mot de passe</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? '8 caractères minimum' : ''}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                  required
                  minLength={tab === 'signup' ? 8 : undefined}
                />
              </div>
              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="text-xs font-medium text-muted-foreground">Confirmer le mot de passe</label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
                    required
                    minLength={8}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'w-full rounded-lg bg-foreground text-background py-2.5 text-sm font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                  submitting && 'opacity-50 cursor-wait',
                )}
              >
                {submitting
                  ? 'Chargement...'
                  : tab === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold">Vérifiez votre email</h2>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Un code à 6 chiffres a été envoyé à <span className="font-medium text-foreground">{verifyEmail}</span>
              </p>

              <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                {codeDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className={cn(
                      'w-10 h-12 text-center text-lg font-semibold rounded-lg border bg-background outline-none transition-colors',
                      digit ? 'border-foreground/30' : 'border-border',
                      'focus:border-foreground/50 focus:ring-1 focus:ring-foreground/20',
                    )}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || codeDigits.some(d => !d)}
                className={cn(
                  'w-full rounded-lg bg-foreground text-background py-2.5 text-sm font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                  (submitting || codeDigits.some(d => !d)) && 'opacity-50 cursor-wait',
                )}
              >
                {submitting ? 'Vérification...' : 'Vérifier'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                  className={cn(
                    'text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded',
                    resendCooldown > 0
                      ? 'text-muted-foreground/50 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {resendCooldown > 0
                    ? `Renvoyer le code (${resendCooldown}s)`
                    : 'Renvoyer le code'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
