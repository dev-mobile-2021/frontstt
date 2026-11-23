import { cn } from "../../lib/utils";

export function Spinner({ className }) {
  return (
    <span className={cn("loader-dots h-3.5 w-3.5", className)} role="status" aria-label="Chargement">
      <span className="loader-dots__circle" />
      <span className="loader-dots__circle" />
      <span className="loader-dots__circle" />
      <span className="loader-dots__circle" />
    </span>
  );
}
