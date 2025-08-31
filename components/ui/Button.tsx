"use client";

import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const button = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-yellow-400 text-black hover:bg-yellow-300",
        secondary: "bg-neutral-900/80 border border-neutral-700 text-neutral-100 hover:bg-neutral-800",
        ghost: "bg-transparent text-neutral-200 hover:bg-neutral-900/40",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export default function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={clsx(button({ variant, size }), className)} {...props} />;
}
