import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form">
      <h1>Create account</h1>
      <p className="muted">Start building argument maps.</p>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password_confirm}
            onChange={handleChange}
          />
        </label>

        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
