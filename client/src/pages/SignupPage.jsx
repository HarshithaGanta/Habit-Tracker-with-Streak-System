import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { AuthContext } from "../context/AuthContext";

const initialState = {
  name: "",
  email: "",
  password: "",
};

export default function SignupPage() {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (formData.password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(formData);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Daily Wins"
      title="Start a habit system that looks clean and proves your logic."
      description="Create an account, build your daily routine, and let the streak engine turn consistency into visible progress."
      highlightTitle="Momentum Mode"
      highlightValue="Built for standout submissions"
    >
      <div className="form-head">
        <h2>Signup</h2>
        <p>Create your account with secure password hashing and JWT authentication.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            type="text"
            name="name"
            placeholder="Harshitha"
            value={formData.name}
            onChange={handleChange}
          />
        </label>

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
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={handleChange}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="primary-button wide-button" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Signup"}
        </button>

        <p className="form-switch">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

