import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary",
        secondary: "bg-secondary/15 text-secondary",
        destructive: "bg-destructive/15 text-destructive",
        outline: "border border-border text-foreground",
        // Status variants for fulfillment
        shipped: "bg-status-shipped/15 text-status-shipped",
        processing: "bg-status-processing/15 text-status-processing",
        pending: "bg-status-pending/15 text-status-pending",
        exception: "bg-status-exception/15 text-status-exception",
        return: "bg-status-return/15 text-status-return",
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
