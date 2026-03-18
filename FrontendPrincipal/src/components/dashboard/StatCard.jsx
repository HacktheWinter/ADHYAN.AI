import { motion } from "framer-motion";

export default function StatCard({ label, value, icon: Icon, tone, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </motion.div>
  );
}
