import { useState } from 'react';
import { decryptApiKey, validateApiKey } from '../lib/crypto';

interface PasswordGateProps {
  onAuthenticated: (apiKey: string, username: string) => void;
}

export default function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [username, setUsername] = useState(() => localStorage.getItem('antiflix_username') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const apiKey = await decryptApiKey(password);
      const valid = await validateApiKey(apiKey);

      if (valid) {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '-');
        localStorage.setItem('antiflix_api_key', apiKey);
        localStorage.setItem('antiflix_username', cleanUsername);
        onAuthenticated(apiKey, cleanUsername);
      } else {
        setError('Password incorrecto');
      }
    } catch {
      setError('Password incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg z-[200] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-sm w-full text-center">
        <h1 className="font-display font-black text-4xl">
          <span className="text-white">anti</span>
          <span className="text-accent">flix</span>
        </h1>
        <p className="font-mono text-[10px] text-muted tracking-[0.3em] uppercase mt-1">
          KILL THE ALGORITHM
        </p>

        <div className="mt-10 space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario"
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-muted focus:outline-none focus:border-accent text-center"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-muted focus:outline-none focus:border-accent text-center"
          />

          {error && (
            <p className="text-accent text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-accent text-white font-mono text-sm py-3 rounded-lg hover:bg-accent/80 transition disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
