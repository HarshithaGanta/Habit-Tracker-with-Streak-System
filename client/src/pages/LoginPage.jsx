import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { AuthContext } from "../context/AuthContext";

const initialState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Habit Tracker"
      title="Protect your streaks with a dashboard that feels alive."
      description="Sign in to manage daily habits, celebrate consistency, and keep your momentum visible every day."
      highlightTitle="Best habit energy"
      highlightValue="Focus. Finish. Repeat."
    >
      <div className="form-head">
        <h2>Login</h2>
        <p>Secure JWT sign-in with your saved account.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input
            type="email"
            name="email"
            placeholder="gantaharshitha26@gmail.com"
            value={formData.email}
            onChange={handleChange}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="primary-button wide-button" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>

        <p className="form-switch">
          Need an account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

