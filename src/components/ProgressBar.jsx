export default function ProgressBar({ value, className = "" }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 70 ? "bg-[#10A651]" : clamped >= 40 ? "bg-[#087F3E]" : "bg-[#087F3E]";

  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 ${className}`}>
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
