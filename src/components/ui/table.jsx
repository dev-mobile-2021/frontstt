import { cn } from "../../lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line-200 bg-white">
      <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-green-800", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-line-100", className)} {...props} />;
}

export function TableRow({ className, clickable, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        clickable && "cursor-pointer hover:bg-green-50/60",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("whitespace-nowrap px-3 py-2.5 text-ink-900", className)} {...props} />;
}

export function TableEmpty({ colSpan, children = "Aucun résultat." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-[13px] text-ink-500">
        {children}
      </td>
    </tr>
  );
}
