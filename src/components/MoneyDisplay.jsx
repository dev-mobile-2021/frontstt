// Displays a monetary amount in FCFA with consistent formatting
// sign: "+" | "-" | null — prepend colored sign indicator
// variant: "normal" | "large" | "small" | "muted"
export default function MoneyDisplay({ amount = 0, sign = null, variant = "normal", className = "" }) {
  const formatted = new Intl.NumberFormat("fr-FR").format(Math.abs(amount));

  const sizeClass =
    variant === "large" ? "text-xl font-bold" :
    variant === "small" ? "text-xs font-medium" :
    variant === "muted" ? "text-sm text-gray-500" :
    "text-sm font-semibold";

  const signColor =
    sign === "+" ? "text-[#087F3E]" :
    sign === "-" ? "text-red-600" :
    "";

  return (
    <span className={`tabular-nums whitespace-nowrap ${sizeClass} ${signColor} ${className}`}>
      {sign && <span className="mr-0.5">{sign}</span>}
      {formatted}
      <span className="ml-1 text-[0.7em] font-normal opacity-70">FCFA</span>
    </span>
  );
}
