import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-line-200 text-ink-500 bg-white",
        green: "border-green-300 text-green-700 bg-green-50",
        greenSolid: "border-green-600 text-white bg-green-600",
        dark: "border-ink-900 text-ink-900 bg-white",
        darkSolid: "border-green-800 text-white bg-green-800",
        subtle: "border-transparent text-ink-500 bg-surface-50",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { badgeVariants };
