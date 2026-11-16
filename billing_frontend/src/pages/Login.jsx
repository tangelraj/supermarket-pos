
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, LockKeyhole } from "lucide-react";
import { getSession, loginStaff } from "../services/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const destination = location.state?.from || "/";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First obtain Django's CSRF cookie
      await getSession();

      const response = await loginStaff(username, password);

      if (response.data.authenticated) {
        onLogin(response.data);
        navigate(destination, { replace: true });
      } else {
        setError("Staff login was not successful.");
      }
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        setError("Incorrect staff username or password.");
      } else if (status === 403) {
        setError("CSRF verification failed. Check Django settings.");
      } else if (status === 404) {
        setError("Login API not found. Check Django URLs.");
      } else {
        setError(
          err.response?.data?.detail ||
          "Cannot connect to the Django server."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <ShoppingCart size={34} />
        </div>

        <h1>Supermarket POS</h1>
        <p>Sign in with your staff account</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>

          <div className="login-input">
            <User size={18} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="login-input">
            <LockKeyhole size={18} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
