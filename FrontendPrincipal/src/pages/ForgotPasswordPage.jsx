import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Mail, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import api from "../api/axios";
import beacon from "../assets/principalBeacon.svg";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#f3f8fc_0%,#e8f2fb_100%)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-[36px] border border-white/70 bg-[#0f172a] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/16 text-sky-300">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400">
                ADHYAN.AI
              </p>
              <h1 className="mt-1 text-3xl font-bold">Reset Principal Access</h1>
            </div>
          </div>

          <p className="mt-8 max-w-xl text-sm leading-7 text-slate-300">
            Request a secure password reset link for the principal inspection panel.
          </p>

          <div className="mt-10 rounded-[28px] bg-white/6 p-4">
            <img src={beacon} alt="Principal inspection analytics" className="w-full rounded-[24px]" />
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="rounded-[34px] border border-white/80 bg-white/96 p-8 shadow-[0_26px_80px_rgba(15,23,42,0.12)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Password recovery
              </p>
              <h2 className="text-2xl font-bold text-slate-950">Forgot password</h2>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                placeholder="principal@adhyan.ai"
              />
            </label>
          </div>

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  If the account exists, a reset link has been sent to the email address.
                </span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>

          <Link
            to="/login"
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </motion.form>
      </div>
    </div>
  );
}
