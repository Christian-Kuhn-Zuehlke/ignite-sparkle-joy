import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40",
  {
    variants: {
      variant: {
        default: "bg-background text-primary border border-primary/20",
        secondary: "bg-muted text-foreground",
        destructive: "bg-destructive-bg text-destructive-emphasis",
        success: "bg-success-bg text-success-emphasis",
        warning: "bg-warning-bg text-warning-emphasis",
        info: "bg-background text-primary",
        outline: "border border-border text-foreground",
        // Status variants for fulfillment
        shipped: "bg-success-bg text-success-emphasis",
        processing: "bg-background text-primary",
        pending: "bg-warning-bg text-warning-emphasis",
        exception: "bg-destructive-bg text-destructive-emphasis",
        return: "bg-muted text-subtitle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
