import { Component, createMemo, For, Show } from "solid-js";

import { cn } from "~/glyph";
import {
  addFonts,
  clearFonts,
  removeFont,
  selectFont,
  store,
} from "~/modules/state";
import { boolean } from "~/utils/boolean";
import { formatFileSize } from "~/utils/format";
import { isMac } from "~/utils/platform";
import { useFilePicker } from "~/utils/useFilePicker";

import styles from "./FontList.module.css";

import { TFont } from "Types";

const modKey = isMac ? "⌘" : "Ctrl";

const FontItem: Component<{ font: TFont }> = (props) => {
  const parsed = createMemo(() => store.parsedFonts[props.font.id]);

  return (
    <div class={styles.itemWrapper}>
      <button
        class={styles.item}
        classList={{
          [styles.selected]: store.selectedFontId === props.font.id,
          [styles.parsed]: !!parsed(),
          pulse: store.parsingFonts[props.font.id],
        }}
        aria-label={`Select ${props.font.name}`}
        onClick={() => selectFont(props.font.id)}
      >
        <span
          class={styles.name}
          style={{ "font-family": `"${props.font.id}", sans-serif` }}
        >
          {props.font.name}
        </span>
        <span class={styles.size}>
          {formatFileSize(props.font.weight.original)}
          {props.font.weight.estimated !== undefined && (
            <>
              <span class={styles.arrow}> → </span>
              <span
                classList={{
                  [styles.estimating]: props.font.weight.estimating,
                }}
              >
                {formatFileSize(props.font.weight.estimated!)}
              </span>
            </>
          )}
        </span>
      </button>
      <button
        class={styles.remove}
        aria-label={`Remove ${props.font.name}`}
        onClick={(e) => {
          // We need to stop propagation to avoid the DropZone component
          // that wraps the app, to catch a click, when user removes the
          // last font.
          e.stopPropagation();
          removeFont(props.font.id);
        }}
      >
        ×
      </button>
    </div>
  );
};

export const FontList: Component = () => {
  const fonts = createMemo(() =>
    store.fontOrder.map((id) => store.fonts[id]).filter(boolean)
  );

  const { openFilePicker } = useFilePicker({ onFilesSelected: addFonts });

  return (
    <Show when={fonts().length > 0}>
      <nav class={styles.container}>
        <div class={styles.list}>
          <For each={fonts()}>{(font) => <FontItem font={font} />}</For>
        </div>
        <div class={styles.actions}>
          <button
            class={cn(styles.item, styles.addFonts)}
            onClick={openFilePicker}
          >
            <div>
              <span class={styles.name}>Add Fonts</span>
              <span class={styles.size}>{modKey} + U</span>
            </div>
          </button>
          <button
            id="clear-all"
            class={cn(styles.item, styles.clearAll)}
            onClick={(e) => {
              e.stopPropagation();
              clearFonts();
            }}
          >
            <div>
              <span class={styles.name}>Clear All</span>
              <span class={styles.size}>{modKey} + Del</span>
            </div>
          </button>
        </div>
      </nav>
    </Show>
  );
};
