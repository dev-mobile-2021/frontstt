import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../lib/utils";

export function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn("text-[11px] font-medium uppercase tracking-wide text-ink-500", className)}
      {...props}
    />
  );
}
