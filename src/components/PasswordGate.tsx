import { useState } from 'react';
import { decryptApiKey, validateApiKey } from '../lib/crypto';

interface PasswordGateProps {
  onAuthenticated: (apiKey: string) => void;
}

export default function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const apiKey = await decryptApiKey(password);
      const valid = await validateApiKey(apiKey);

      if (valid) {
        localStorage.setItem('antiflix_api_key', apiKey);
        onAuthenticated(apiKey);
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

        <div className="mt-10">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-muted focus:outline-none focus:border-accent text-center"
          />

          {error && (
            <p className="text-accent text-xs font-mono mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-accent text-white font-mono text-sm py-3 rounded-lg hover:bg-accent/80 transition disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
