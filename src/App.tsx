import {
  Component,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { DropZone } from "~/components/FontDropZone/DropZone";
import { FontList } from "~/components/FontList/FontList";
import { GlyphTable } from "~/components/GlyphTable/GlyphTable";
import {
  addFonts,
  clearFonts,
  hydrateFromPersistence,
  store,
} from "~/modules/state";
import { filterFontFiles, FONT_FILE_ACCEPT } from "~/utils/files";
import { isMac } from "~/utils/platform";

import styles from "./App.module.css";

export const App: Component = () => {
  const [hydrated, setHydrated] = createSignal(false);
  const isEmpty = createMemo(() => Object.keys(store.fonts).length === 0);

  const acceptFontFiles = (files: FileList | File[] | null) => {
    const fontFiles = filterFontFiles(files);
    if (fontFiles.length > 0) {
      addFonts(fontFiles);
    }
  };

  let fileInputRef!: HTMLInputElement;
  const openFilePicker = () => {
    fileInputRef.value = "";
    fileInputRef.click();
  };

  const handleFileInputChange: JSX.EventHandler<HTMLInputElement, Event> = (
    e
  ) => acceptFontFiles(e.currentTarget.files);

  onMount(() => {
    hydrateFromPersistence(() => setHydrated(true));

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyU" && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        openFilePicker();
      }
      const isClearShortcut = isMac
        ? e.metaKey && (e.code === "Delete" || e.code === "Backspace")
        : e.ctrlKey && e.code === "Delete";
      if (isClearShortcut && Object.keys(store.fonts).length > 0) {
        e.preventDefault();
        clearFonts();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleGlobalKeyDown));
  });

  return (
    <Show when={hydrated()}>
      <input
        type="file"
        ref={fileInputRef}
        class={styles.fileInput}
        multiple
        accept={FONT_FILE_ACCEPT}
        aria-hidden
        tabIndex={-1}
        onChange={handleFileInputChange}
      />
      <DropZone
        openFilePicker={openFilePicker}
        onDroppedFontFiles={acceptFontFiles}
      >
        <div class={styles.main}>
          <FontList openFilePicker={openFilePicker} />
          <GlyphTable />
        </div>
      </DropZone>
      {isEmpty() && (
        <footer>
          <div>© 2026 Prototypic</div>
          <a href="/about" style="margin-left: auto">
            About
          </a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </footer>
      )}
    </Show>
  );
};
