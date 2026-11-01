import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "quiet";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-[#F6EBDD] border border-[#B93A3A] hover:bg-[#B93A3A] hover:border-[#C94A4A] shadow-[0_10px_30px_-18px_rgba(168,50,50,0.9)]",
  secondary:
    "bg-surface-2 text-parchment border border-line hover:border-line-strong hover:bg-[#282830]",
  outline:
    "bg-transparent text-parchment border border-line hover:border-line-strong hover:bg-white/[0.03]",
  ghost: "bg-transparent text-muted border border-transparent hover:text-parchment hover:bg-white/[0.04]",
  danger:
    "bg-transparent text-[#D98A8A] border border-[#5A2B2B] hover:bg-[#A83232]/15 hover:border-[#7A3636]",
  quiet: "bg-white/[0.03] text-parchment border border-transparent hover:bg-white/[0.06]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-[4px]",
  md: "h-10 px-4 text-[13.5px] gap-2 rounded-[4px]",
  lg: "h-12 px-6 text-[14px] gap-2.5 rounded-[5px]",
  icon: "h-9 w-9 rounded-[4px] justify-center",
  "icon-sm": "h-7 w-7 rounded-[3px] justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium tracking-[0.01em] transition-all duration-200",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

export function IconButton({
  className,
  label,
  ...props
}: ButtonProps & { label: string }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn("text-muted hover:text-parchment", className)}
      {...props}
    />
  );
}
