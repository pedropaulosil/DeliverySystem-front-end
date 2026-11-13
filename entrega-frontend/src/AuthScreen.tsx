import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';

export type AuthMode = 'login' | 'register';

type Props = {
  onAuthenticate: (mode: AuthMode, data: { name?: string; email: string; password: string }) => Promise<void>;
  onGuest: () => void;
};

export default function AuthScreen({ onAuthenticate, onGuest }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setPassword('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim();
    if (mode === 'register' && !name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (!cleanEmail.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onAuthenticate(mode, {
        name: mode === 'register' ? name.trim() : undefined,
        email: cleanEmail,
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <span className="brand-mark">e</span>
            <span className="brand-word">entrega<span>já</span></span>
          </div>

          <h1 id="auth-title" className="sr-only">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar uma nova conta'}
          </h1>

          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === 'register' && (
              <label className="auth-field">
                <span>Nome</span>
                <div className="auth-input">
                  <UserRound size={17} strokeWidth={1.9} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>
              </label>
            )}

            <label className="auth-field">
              <span>E-mail</span>
              <div className="auth-input">
                <Mail size={17} strokeWidth={1.9} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <div className="auth-input">
                <Lock size={17} strokeWidth={1.9} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Sua senha' : 'Mínimo de 6 caracteres'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="primary-btn block" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <button type="button" className="ghost-btn block" onClick={onGuest}>
            Continuar sem entrar <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
