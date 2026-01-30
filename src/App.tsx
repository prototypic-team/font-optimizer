import { Component, Show } from "solid-js";

import { store } from "~/modules/state";
import { DropZone } from "~/modules/uploader/FontDropZone/DropZone";
import { FontList } from "~/modules/uploader/FontList/FontList";

export const App: Component = () => {
  return (
    <DropZone>
      <Show
        when={store.fonts.length > 0}
        fallback={"Drop fonts here or click to select"}
      >
        <FontList fonts={store.fonts} />
      </Show>
    </DropZone>
  );
};
