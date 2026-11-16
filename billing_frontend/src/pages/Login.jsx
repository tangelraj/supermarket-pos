
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  User,
  LockKeyhole,
} from "lucide-react";

import { loginStaff } from "../services/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const destination = location.state?.from || "/";

  // ============================================================
  // HANDLE STAFF LOGIN
  // ============================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // loginStaff() fetches a fresh CSRF token internally.
      const response = await loginStaff(
        username.trim(),
        password
      );

      if (response.data?.authenticated === true) {
        // Update authentication state in App.jsx
        if (typeof onLogin === "function") {
          onLogin(response.data);
        }

        // Navigate to the dashboard
        navigate(destination, {
          replace: true,
        });
      } else {
        setError("Staff login was not successful.");
      }
    } catch (err) {
      console.error("Staff login error:", err);

      const status = err.response?.status;
      const serverMessage =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "";

      if (status === 400) {
        setError(
          serverMessage ||
          "Please enter a valid username and password."
        );
      } else if (status === 401) {
        setError("Incorrect staff username or password.");
      } else if (status === 403) {
        setError(
          "Login was rejected (403). Check CSRF settings, cookies, and staff permissions."
        );
      } else if (status === 404) {
        setError(
          "Login API not found. Check the Django backend URL."
        );
      } else if (status >= 500) {
        setError(
          "Django server error. Please check Render logs."
        );
      } else if (!err.response) {
        setError(
          "Cannot connect to the Django server. Check your internet connection and API configuration."
        );
      } else {
        setError(
          serverMessage ||
          "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <ShoppingCart size={34} />
        </div>

        <h1>Supermarket POS</h1>

        <p>Sign in with your staff account</p>

        {/* Login form */}
        <form onSubmit={handleSubmit}>

          {/* Username */}
          <label htmlFor="username">
            Username
          </label>

          <div className="login-input">
            <User size={18} />

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <label htmlFor="password">
            Password
          </label>

          <div className="login-input">
            <LockKeyhole size={18} />

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              className="login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>

        </form>
      </div>
    </div>
  );
}
