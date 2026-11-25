export default function ProgressBar({ value, className = "" }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 70 ? "bg-[#10A651]" : clamped >= 40 ? "bg-[green-600]" : "bg-[green-600]";

  return (
    <div className={`w-full bg-line-100 rounded-full h-2 ${className}`}>
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
