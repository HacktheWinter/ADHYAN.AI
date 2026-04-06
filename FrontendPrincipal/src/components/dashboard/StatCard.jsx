import { motion } from "framer-motion";

export default function StatCard({ label, value, icon: Icon, tone, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-[28px] border border-gray-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(88,28,135,0.08)]"
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </motion.div>
  );
}
