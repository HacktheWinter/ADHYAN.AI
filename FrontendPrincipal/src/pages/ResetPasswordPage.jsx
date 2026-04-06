import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { LANDING_PAGE_URL } from "../config";
import api from "../api/axios";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !token) {
      setError("This reset link is invalid or incomplete.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/principal/reset-password", {
        email,
        token,
        password,
      });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      console.error("Principal password reset failed:", requestError);
      setError(
        requestError.response?.data?.error ||
          "Unable to reset password. Please request a new link."
      );
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
                Set a new password inside the same ADHYAN.AI theme
              </h2>
              <p className="text-lg text-gray-600">
                Complete the reset flow and return to the principal inspection panel
                with the same styling used in teacher and student.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 text-white shadow-xl">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Strong recovery flow</p>
                  <p className="mt-1 text-sm text-purple-100">
                    Reset access with a new password before returning to the dashboard.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Project branding only</p>
                  <p className="mt-1 text-sm text-purple-100">
                    The project logo is now the branded element for the principal reset experience.
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
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
                Password reset
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Reset password</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Account: <span className="font-semibold text-gray-900">{email || "Unknown"}</span>
          </p>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="Enter new password"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="Confirm new password"
              />
            </label>
          </div>

          {success ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Password reset successful. You can now sign in.</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || success}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>

          <Link
            to="/login"
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </motion.form>
      </div>
    </div>
  );
}
