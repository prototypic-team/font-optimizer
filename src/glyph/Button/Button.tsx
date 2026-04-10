import { Component, JSX, Show, splitProps } from "solid-js";

import { cn } from "../cn";
import { Loader } from "../Loader/Loader";
import styles from "./Button.module.css";

type ButtonProps = MergeWithPriority<
  {
    /**
     * Renders button in a loading state: disabled and with a loader
     * instead of the button text
     */
    loading?: boolean;

    /**
     * Visual style of the button
     */
    kind?: "default" | "primary" | "secondary";
  },
  JSX.ButtonHTMLAttributes<HTMLButtonElement>
>;

export const Button: Component<ButtonProps> = (props) => {
  const [local, other] = splitProps(props, [
    "kind",
    "children",
    "class",
    "disabled",
    "loading",
    "type",
  ]);

  return (
    <button
      class={cn(styles.button, styles[local.kind || "default"], local.class)}
      disabled={local.disabled || local.loading}
      type={local.type || "button"}
      {...other}
    >
      <span class={cn(styles.inner, local.loading && styles.hidden)}>
        {local.children}
      </span>
      <Show when={local.loading}>
        <Loader class={styles.loader} />
      </Show>
    </button>
  );
};
