import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-xl border border-line-200 bg-white shadow-xs", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center justify-between gap-4 border-b border-line-200 px-4 py-3", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-[13px] font-semibold text-ink-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-xs text-ink-500", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}
