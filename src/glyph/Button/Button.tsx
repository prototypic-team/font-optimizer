import { Component, JSX, Show, splitProps } from "solid-js";

import { cn } from "../cn";
import { focusPropsNames, useFocus } from "../hooks/focusVisible";
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
    kind?: "accent" | "base" | "danger" | "default" | "primary" | "text";

    /**
     * Size of the button.
     */
    size?: "regular" | "small" | "micro" | "large";

    /**
     * Applies a disabled style to the button, but keeps it interactive.
     * The use case for that is to provide a feedback for the user,
     * when they try to click on disabled button. For example, in forms,
     * if form is invalid, we disable the submit button, but when the user
     * clicks on it, we focus the first field that has an error.
     */
    visuallyDisabled?: boolean;
  },
  Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "classList">
>;

export const Button: Component<ButtonProps> = (props) => {
  const [local, focus, other] = splitProps(
    props,
    [
      "kind",
      "children",
      "class",
      "disabled",
      "loading",
      "size",
      "type",
      "visuallyDisabled",
    ],
    focusPropsNames
  );

  const { focusVisible, props: focusProps } = useFocus(focus);
  return (
    <button
      class={cn(
        styles.button,
        styles[local.kind || "default"],
        styles[local.size || "regular"],
        local.visuallyDisabled && styles.disabled,
        local.class
      )}
      data-kind={local.kind}
      data-focus-visible={focusVisible()}
      disabled={local.disabled || local.loading}
      type={local.type || "button"}
      {...focusProps}
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
