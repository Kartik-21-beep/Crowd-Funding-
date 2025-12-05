import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("signup");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      if (res.data.success) {
        setSuccess(res.data.message || "OTP sent to your email!");
        setStep("verify");
      } else {
        setError(res.data.message || "Signup failed");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/verify-otp", {
        email,
        otp,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("userLogin"));
        setSuccess("Account verified! Redirecting...");
        setTimeout(() => {
          navigate("/home");
        }, 1000);
      } else {
        setError(res.data.message || "OTP verification failed");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "50px auto" }}>
        <h2>Verify OTP</h2>

        {success && (
          <div style={{ color: "green", marginBottom: "10px", padding: "10px", background: "#e8f5e9", borderRadius: "4px" }}>
            {success}
          </div>
        )}

        {error && (
          <div style={{ color: "red", marginBottom: "10px", padding: "10px", background: "#ffebee", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <p style={{ marginBottom: "20px", color: "#666" }}>
          We've sent an OTP to <strong>{email}</strong>. Please check your email and enter the OTP below.
        </p>

        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="text"
            placeholder="Enter OTP (6 digits)"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            maxLength={6}
            style={{ marginBottom: 10, padding: 8, fontSize: "18px", textAlign: "center", letterSpacing: "4px" }}
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              padding: 10,
              background: otp.length === 6 ? "#333" : "#ccc",
              color: "#fff",
              cursor: otp.length === 6 ? "pointer" : "not-allowed",
              marginBottom: 10,
            }}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          onClick={() => {
            setStep("signup");
            setOtp("");
            setError("");
            setSuccess("");
          }}
          style={{
            padding: 10,
            background: "transparent",
            color: "#333",
            cursor: "pointer",
            border: "1px solid #ccc",
            width: "100%",
          }}
        >
          Back to Signup
        </button>

        <p style={{ marginTop: "15px" }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "50px auto" }}>
      <h2>Sign Up</h2>

      {error && (
        <div style={{ color: "red", marginBottom: "10px", padding: "10px", background: "#ffebee", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: "green", marginBottom: "10px", padding: "10px", background: "#e8f5e9", borderRadius: "4px" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column" }}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: 10, padding: 8 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, background: "#333", color: "#fff", cursor: "pointer" }}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Signup;

