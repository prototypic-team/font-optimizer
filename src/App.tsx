import { Component, createMemo, createSignal, onMount, Show } from "solid-js";

import { DropZone } from "~/components/FontDropZone/DropZone";
import { FontList } from "~/components/FontList/FontList";
import { GlyphTable } from "~/components/GlyphTable/GlyphTable";
import { hydrateFromPersistence, store } from "~/modules/state";

import styles from "./App.module.css";

export const App: Component = () => {
  const [hydrated, setHydrated] = createSignal(false);
  const isEmpty = createMemo(() => Object.keys(store.fonts).length === 0);

  onMount(() => hydrateFromPersistence(() => setHydrated(true)));

  return (
    <Show when={hydrated()}>
      <>
        <DropZone>
          <div class={styles.main}>
            <FontList />
            <GlyphTable />
          </div>
        </DropZone>
        {isEmpty() && (
          <footer>
            <div>© 2026 Prototypic</div>
            <a href="/terms" style="margin-left: auto">
              Terms of Service
            </a>
            <a href="/privacy">Privacy Policy</a>
          </footer>
        )}
      </>
    </Show>
  );
};
