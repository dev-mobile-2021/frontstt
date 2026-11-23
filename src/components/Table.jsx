import { cn } from "../lib/utils";

export function Table({ className, children }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line-200 bg-white">
      <table className={cn("w-full border-collapse text-[13px]", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children }) {
  return <thead className={cn("bg-green-800", className)}>{children}</thead>;
}

export function TableBody({ className, children }) {
  return <tbody className={cn("divide-y divide-line-100", className)}>{children}</tbody>;
}

export function TableRow({ className, clickable, children, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        clickable && "cursor-pointer hover:bg-green-50/60",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn("whitespace-nowrap px-3 py-2.5 text-ink-900", className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, icon: Icon, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        {Icon && <Icon size={28} className="mx-auto mb-2 text-ink-300" strokeWidth={1.5} />}
        <p className="text-[13px] text-ink-500">{message}</p>
      </td>
    </tr>
  );
}
