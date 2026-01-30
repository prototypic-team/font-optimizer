import { Component, For, onCleanup, onMount } from "solid-js";

import { formatFileSize } from "~/modules/uploader/format";

import styles from "./FontList.module.css";

import type { TFont } from "Types";

const fontFamilyFor = (id: string) => `font-${id}`;

type FontNameProps = {
  font: TFont;
  class?: string;
};

const FontName: Component<FontNameProps> = (props) => {
  const family = fontFamilyFor(props.font.id);

  onMount(() => {
    const url = URL.createObjectURL(props.font.file);
    const face = new FontFace(family, `url(${url})`);
    face.load().then((loaded) => {
      document.fonts.add(loaded);
    });
    onCleanup(() => URL.revokeObjectURL(url));
  });

  return (
    <span
      class={props.class}
      style={{ "font-family": `"${family}", sans-serif` }}
    >
      {props.font.name}
    </span>
  );
};

type Props = {
  fonts: TFont[];
};

export const FontList: Component<Props> = (props) => {
  return (
    <ul class={styles.list}>
      <For each={props.fonts}>
        {(font) => (
          <li class={styles.item}>
            <FontName font={font} class={styles.name} />
            <span class={styles.size}>
              {formatFileSize(font.size)}
              {font.extension && `・${font.extension}`}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
};
