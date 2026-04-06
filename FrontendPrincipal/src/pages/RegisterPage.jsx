import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { LANDING_PAGE_URL } from "../config";
import { loginPrincipal, registerPrincipal } from "../api/principalApi";
import { persistAuth } from "../utils/authStorage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setSubmitting(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password must match");
      setSubmitting(false);
      return;
    }

    try {
      await registerPrincipal({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      const loginResponse = await loginPrincipal({
        email: form.email.trim(),
        password: form.password,
      });

      persistAuth(loginResponse.token, loginResponse.principal, form.rememberMe);
      navigate("/", { replace: true });
    } catch (requestError) {
      console.error("Principal registration failed:", requestError);
      setError(requestError.response?.data?.error || "Unable to create principal account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 px-4 py-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block"
        >
          <div className="text-center space-y-6">
            <a
              href={LANDING_PAGE_URL}
              className="flex items-center justify-center space-x-2"
            >
              <img
                src="/logo02.png"
                alt="ADHYAN.AI Logo"
                className="h-20 w-20 object-contain"
              />
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-900">ADHYAN.AI</h1>
                <p className="text-sm text-gray-500">Principal Panel</p>
              </div>
            </a>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-800">
                Create principal access in the same platform style
              </h2>
              <p className="text-lg text-gray-600">
                Set up an oversight account for institutional visibility across classes,
                teacher activity, attendance, and published work.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 text-white shadow-xl">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Cross-panel consistency</p>
                  <p className="mt-1 text-sm text-purple-100">
                    The principal workspace now follows the same visual language as teacher and student.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Secure principal access</p>
                  <p className="mt-1 text-sm text-purple-100">
                    Create a dedicated account for review, visibility, and monitoring.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Immediate dashboard access</p>
                  <p className="mt-1 text-sm text-purple-100">
                    New principal accounts sign in directly after successful registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/80 bg-white p-8 shadow-2xl md:p-10"
        >
          <div className="mb-6 text-center lg:hidden">
            <a
              href={LANDING_PAGE_URL}
              className="inline-flex items-center justify-center space-x-2"
            >
              <img
                src="/logo02.png"
                alt="ADHYAN.AI Logo"
                className="h-12 w-12 object-contain"
              />
              <div className="text-left">
                <span className="block text-2xl font-bold text-gray-900">ADHYAN.AI</span>
                <span className="text-sm text-gray-500">Principal Panel</span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
                New principal
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Create a principal account to access the oversight dashboard.
          </p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Full name</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="Principal name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="principal@adhyan.ai"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="At least 6 characters"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="Re-enter password"
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input
                name="rememberMe"
                type="checkbox"
                checked={form.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Keep me signed in on this device
            </label>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create principal account"}
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700">
              Sign in
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
