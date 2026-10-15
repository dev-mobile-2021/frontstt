import { cn } from "../utils/cn";

/** Wrapper scrollable — identique au design GMAO */
export function Table({ className, children }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className={cn("w-full border-collapse text-[13px]", className)}>
        {children}
      </table>
    </div>
  );
}

/** En-tête vert foncé CSE */
export function TableHeader({ className, children }) {
  return (
    <thead className={cn("bg-[#065A2C]", className)}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children }) {
  return (
    <tbody className={cn("divide-y divide-gray-100", className)}>
      {children}
    </tbody>
  );
}

/** Ligne — clickable ajoute le curseur + hover vert pâle */
export function TableRow({ className, clickable, children, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        clickable && "cursor-pointer hover:bg-[#E8F5EE]/60",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

/** Cellule d'en-tête — texte blanc, uppercase, compact */
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

/** Cellule de données */
export function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn("whitespace-nowrap px-3 py-2.5 text-gray-900", className)}
      {...props}
    >
      {children}
    </td>
  );
}

/** Ligne vide / état zéro */
export function TableEmpty({ colSpan, icon: Icon, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        {Icon && <Icon size={28} className="mx-auto mb-2 text-gray-300" />}
        <p className="text-sm text-gray-400">{message}</p>
      </td>
    </tr>
  );
}
