"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-sky-600 px-4 py-2.5 text-white shadow-[0_10px_24px_-12px_rgba(2,132,199,0.9)] hover:bg-sky-700",
        secondary:
          "border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        ghost: "px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger:
          "bg-rose-600 px-4 py-2.5 text-white shadow-[0_10px_24px_-12px_rgba(225,29,72,0.7)] hover:bg-rose-700",
      },
      size: {
        default: "",
        sm: "px-3 py-2 text-xs",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
