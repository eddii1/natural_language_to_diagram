"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-4 py-2.5 text-white shadow-[0_18px_40px_-20px_rgba(37,99,235,0.95)] hover:brightness-110",
        secondary:
          "border border-white/10 bg-white/[0.05] px-4 py-2.5 text-slate-100 hover:border-white/15 hover:bg-white/[0.1]",
        ghost: "px-3 py-2 text-slate-300 hover:bg-white/[0.08] hover:text-white",
        danger:
          "border border-rose-400/20 bg-rose-500/15 px-4 py-2.5 text-rose-100 shadow-[0_18px_40px_-20px_rgba(190,24,93,0.65)] hover:bg-rose-500/25",
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
