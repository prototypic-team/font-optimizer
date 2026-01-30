import { Component, createSignal, JSX } from "solid-js";

import { cn } from "~/glyph";
import { addFonts, store } from "~/modules/state";
import { useFilePicker } from "~/modules/uploader/useFilePicker";

import styles from "./DropZone.module.css";

type Props = {
  children?: JSX.Element;
};

export const DropZone: Component<Props> = (props) => {
  const [dragging, setDragging] = createSignal(false);
  const { openFilePicker, handleFileList } = useFilePicker({
    onFilesSelected: addFonts,
  });

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (
    e
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  };

  const hasFiles = (e: DragEvent) =>
    e.dataTransfer?.types.includes("Files") ?? false;

  const handleDragOver: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
    if (hasFiles(e)) setDragging(true);
  };

  const handleDragLeave: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileList(e.dataTransfer?.files ?? null);
  };

  return (
    <div
      class={cn(
        styles.zone,
        dragging() && styles.dragging,
        !store.fonts.length && styles.empty
      )}
      tabIndex={0}
      role="button"
      aria-label="Drop font files here or click to select"
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span class={styles.dropHint} aria-hidden>
        Drop here
      </span>
      <div class={styles.content}>{props.children}</div>
    </div>
  );
};
