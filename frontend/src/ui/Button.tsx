import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  solid:
    "btn-solid",
  outline:
    "btn-outline",
  ghost:
    "btn-ghost",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
};

export function Button({
  className,
  variant = "outline",
  size = "md",
  ...props
}: ButtonProps) {
  const cls = [ "btn-base", variantClasses[variant], sizeClasses[size], className ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...props} />
  );
}
