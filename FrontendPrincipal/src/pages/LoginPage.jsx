import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { LANDING_PAGE_URL } from "../config";
import { loginPrincipal } from "../api/principalApi";
import { persistAuth } from "../utils/authStorage";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
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

    try {
      const response = await loginPrincipal({
        email: form.email.trim(),
        password: form.password,
      });

      persistAuth(response.token, response.principal, form.rememberMe);
      navigate("/", { replace: true });
    } catch (requestError) {
      console.error("Principal login failed:", requestError);
      setError(requestError.response?.data?.error || "Unable to sign in");
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
                Principal oversight.
              </h2>
              <p className="text-lg text-gray-600">
                Review classes, teachers, activity, and academic output from a single
                inspection workspace.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 text-white shadow-xl">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Institution snapshot</p>
                  <p className="mt-1 text-sm text-purple-100">
                    Track teachers, students, classes, and live activity.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Read-only inspection</p>
                  <p className="mt-1 text-sm text-purple-100">
                    Monitor academic operations without changing teacher or student data.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Unified branding</p>
                  <p className="mt-1 text-sm text-purple-100">
                    The principal experience now aligns with the rest of the platform.
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
                Secure access
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Enter your principal credentials to open the inspection dashboard.
          </p>

          <div className="mt-8 space-y-5">
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
                placeholder="Enter your password"
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
            {submitting ? "Signing in..." : "Enter principal panel"}
          </button>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <Link to="/forgot-password" className="font-semibold text-purple-600 hover:text-purple-700">
              Forgot password?
            </Link>
          </div>

          <p className="mt-5 text-center text-sm text-gray-600">
            No principal account yet?{" "}
            <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700">
              Create account
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
