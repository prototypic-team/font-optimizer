import { Component, createMemo, createSignal, JSX, onCleanup, onMount, Show } from "solid-js";

import { addFonts, store } from "~/modules/state";
import { collectFilesFromDrop, useFilePicker } from "~/utils/useFilePicker";

import styles from "./DropZone.module.css";

type Props = {
  children?: JSX.Element;
};

export const DropZone: Component<Props> = (props) => {
  const [dragging, setDragging] = createSignal(false);
  let dragCounter = 0;

  const { openFilePicker, handleFileList } = useFilePicker({
    onFilesSelected: addFonts,
  });

  onMount(() => {
    const isMac = navigator.platform.startsWith("Mac");
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyU" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        openFilePicker();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleGlobalKeyDown));
  });

  const handleClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = () => {
    if (Object.keys(store.fonts).length > 0) return;
    openFilePicker();
  };

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (
    e
  ) => {
    if (Object.keys(store.fonts).length > 0) return;
    if (e.key === "Enter" || e.key === " ") {
      openFilePicker();
    }
  };

  const handleDragOver: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
  };

  const handleDragEnter: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer?.types.includes("Files")) setDragging(true);
  };

  const handleDragLeave: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) setDragging(false);
  };

  const handleDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = async (e) => {
    e.preventDefault();
    dragCounter = 0;
    setDragging(false);
    const files = await collectFilesFromDrop(e.dataTransfer ?? null);
    handleFileList(files.length > 0 ? files : null);
  };

  const isEmpty = createMemo(() => Object.keys(store.fonts).length === 0);

  return (
    <div
      class={styles.zone}
      classList={{ [styles.dragging]: dragging() }}
      tabIndex={isEmpty() ? 0 : undefined}
      role={isEmpty() ? "button" : undefined}
      aria-label={
        isEmpty() ? "Drop font files here or click to select" : undefined
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span class={styles.dropHint} aria-hidden>
        Drop here
      </span>
      <Show when={isEmpty()} fallback={props.children}>
        <div class={styles.empty}>
          <span>
            Drag and drop or <span class={styles.select}>select fonts</span>
          </span>
          <span class={styles.formats}>.otf, .ttf, .woff, .woff2</span>
        </div>
      </Show>
    </div>
  );
};
