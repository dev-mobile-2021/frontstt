import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        primary: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
        secondary: "bg-white text-ink-900 border border-line-200 hover:bg-surface-50 hover:border-ink-300",
        ghost: "text-ink-700 hover:bg-surface-50",
        outline: "border border-green-600 text-green-600 hover:bg-green-50",
        danger: "bg-white text-ink-900 border border-line-200 hover:bg-ink-900 hover:text-white",
        link: "text-green-600 hover:text-green-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3",
        lg: "h-10 px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";

export { buttonVariants };
