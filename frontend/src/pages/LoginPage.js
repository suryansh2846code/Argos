import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid username or password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form">
      <h1>Sign in</h1>
      <p className="muted">Access your argument maps.</p>

      {error && <div className="alert alert--error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span>Username</span>
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            value={form.username}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
          />
        </label>

        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
