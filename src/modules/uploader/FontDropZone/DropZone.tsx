import { Component, createMemo, createSignal, JSX } from "solid-js";

import { cn } from "~/glyph";
import { addFonts, store } from "~/modules/state";
import {
  collectFilesFromDrop,
  useFilePicker,
} from "~/modules/uploader/useFilePicker";

import styles from "./DropZone.module.css";

type Props = {
  children?: JSX.Element;
};

export const DropZone: Component<Props> = (props) => {
  const [dragging, setDragging] = createSignal(false);
  const { openFilePicker, handleFileList } = useFilePicker({
    onFilesSelected: addFonts,
  });

  const handleClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = () => {
    if (store.fonts.length > 0) return;
    openFilePicker();
  };

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (
    e
  ) => {
    if (store.fonts.length > 0) return;
    if (e.key === "Enter" || e.key === " ") {
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

  const handleDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = await collectFilesFromDrop(e.dataTransfer ?? null);
    handleFileList(files.length > 0 ? files : null);
  };

  const isEmpty = createMemo(() => store.fonts.length === 0);

  return (
    <div
      class={cn(
        styles.zone,
        dragging() && styles.dragging,
        isEmpty() && styles.empty
      )}
      tabIndex={isEmpty() ? 0 : undefined}
      role={isEmpty() ? "button" : undefined}
      aria-label={
        isEmpty() ? "Drop font files here or click to select" : undefined
      }
      onClick={handleClick}
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
