import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 min-w-[9rem] items-center justify-between gap-2 rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 transition-colors duration-150 hover:border-ink-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 data-[placeholder]:text-ink-400",
        "disabled:cursor-not-allowed disabled:border-line-200 disabled:bg-line-100 disabled:text-ink-500 disabled:hover:border-line-200 data-[disabled]:[&_svg]:text-ink-300",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[9rem] overflow-hidden rounded-md border border-line-200 bg-white shadow-popover",
          className
        )}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[inherit] overflow-y-auto p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-[4px] py-1.5 pl-7 pr-2 text-[13px] text-ink-900 outline-none transition-colors duration-150 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700 data-[state=checked]:font-medium",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-green-600" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
