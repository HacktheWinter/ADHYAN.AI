import { useState } from "react";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LANDING_PAGE_URL } from "../config";
import api from "../api/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError("");

    try {
      await api.post("/principal/forgot-password", { email: email.trim() });
      setSuccess(true);
      setEmail("");
    } catch (requestError) {
      console.error("Principal forgot-password failed:", requestError);
      setError(
        requestError.response?.data?.error ||
          "Unable to send reset link. Please try again."
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
                Recover principal access with the project brand in place
              </h2>
              <p className="text-lg text-gray-600">
                Request a reset link for the principal dashboard and return to the
                same ADHYAN.AI visual system used across the platform.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-purple-700 p-8 text-white shadow-xl">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Secure recovery</p>
                  <p className="mt-1 text-sm text-purple-100">
                    Reset links are issued only through the registered principal email.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-4 text-left">
                  <p className="font-semibold">Clean principal flow</p>
                  <p className="mt-1 text-sm text-purple-100">
                    No custom beacon or alternate branding remains in this screen.
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
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">
                Password recovery
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Forgot password</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Enter the principal email address to receive a reset link.
          </p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Email</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-purple-600"
                placeholder="principal@adhyan.ai"
              />
            </label>
          </div>

          {success ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  If the account exists, a reset link has been sent to the email address.
                </span>
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
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send reset link"}
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
