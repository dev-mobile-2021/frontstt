import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List className={cn("flex items-center gap-1 border-b border-line-200", className)} {...props} />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative -mb-px px-3 py-2 text-[13px] font-medium text-ink-500 border-b-2 border-transparent transition-colors duration-150 hover:text-ink-900 data-[state=active]:text-green-600 data-[state=active]:border-green-600 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn("pt-4 focus-visible:outline-none", className)} {...props} />;
}
