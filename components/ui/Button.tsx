import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "gold" | "ghost";

interface BaseProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

interface LinkButtonProps extends BaseProps {
  href: string;
  external?: boolean;
  onClick?: never;
  type?: never;
  disabled?: never;
}

interface ActionButtonProps extends BaseProps {
  href?: undefined;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
}

type ButtonProps = LinkButtonProps | ActionButtonProps;

function classes(variant: Variant, className?: string) {
  return `btn ${variant === "gold" ? "btn-gold" : "btn-ghost"} ${className ?? ""}`.trim();
}

/** Botón de marca (gold/ghost). Renderiza <Link> si recibe href, o <button> en caso contrario. */
export function Button(props: ButtonProps) {
  const variant = props.variant ?? "gold";

  if (props.href) {
    if (props.external) {
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes(variant, props.className)}
        >
          {props.children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes(variant, props.className)}>
        {props.children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={classes(variant, props.className)}
    >
      {props.children}
    </button>
  );
}
