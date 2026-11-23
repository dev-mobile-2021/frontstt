import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100",
      "disabled:cursor-not-allowed disabled:border-line-200 disabled:bg-line-100 disabled:text-ink-500 disabled:hover:border-line-200",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
