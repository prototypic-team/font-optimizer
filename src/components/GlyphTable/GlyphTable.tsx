import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";

import { Button } from "~/glyph";
import { estimateSize, useCurrentFont } from "~/modules/fonts/utils";
import { exportAllFonts, exportSelectedFont, store } from "~/modules/state";
import { formatFileSize } from "~/utils/format";

import { GlyphGroup } from "./GlyphGroup";
import { GlyphSkeleton } from "./GlyphSkeleton";
import styles from "./GlyphTable.module.css";

export const GlyphTable: Component = () => {
  const { base, parsed, isParsing } = useCurrentFont();
  const [exporting, setExporting] = createSignal(false);
  const [exportingAll, setExportingAll] = createSignal(false);
  const [hasContentBelow, setHasContentBelow] = createSignal(false);
  let sentinelRef!: HTMLDivElement;

  createEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHasContentBelow(!entry!.isIntersecting),
      { rootMargin: "0px 0px -56px 0px", threshold: 0 }
    );
    if (sentinelRef.isConnected) {
      observer.observe(sentinelRef);
    }
    onCleanup(() => observer.disconnect());
  });

  const disabledGlyphsCount = createMemo(() => {
    if (!base() || !parsed()) return 0;

    return Object.values(base()!.disabledCodePoints).filter((v) => v === true)
      .length;
  });
  const glyphCount = createMemo(() =>
    parsed() ? parsed()!.totalGlyphs - disabledGlyphsCount() : 0
  );
  const estimatedSize = createMemo(() => {
    if (!parsed() || !base()) return 0;

    return estimateSize(glyphCount(), parsed()!.totalGlyphs, base()!.size)
      .bytes;
  });

  const canExport = createMemo(() => parsed() && glyphCount() > 0);
  const canExportAll = createMemo(() =>
    store.fontOrder.every((id) => store.parsedFonts[id])
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSelectedFont();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      await exportAllFonts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <Show when={base()}>
      <div class={styles.table}>
        <header class={styles.header}>
          <h1
            classList={{
              [styles.parsed]: !!parsed(),
              pulse: isParsing(),
            }}
            style={{ "font-family": `"${base()!.id}", sans-serif` }}
          >
            {base()!.name}
          </h1>
          {parsed() && (
            <div class={styles.fontInfo}>
              <div class={styles.fontMeta}>
                {disabledGlyphsCount()
                  ? `${glyphCount()} / ${parsed()!.totalGlyphs}`
                  : glyphCount()}{" "}
                glyphs
                <span class={styles.fontFileSize}>
                  {disabledGlyphsCount()
                    ? `${formatFileSize(base()!.size)} → ${formatFileSize(estimatedSize())}`
                    : formatFileSize(base()!.size)}
                </span>
              </div>
            </div>
          )}
        </header>
        <div class={styles.groups}>
          <Show
            when={parsed()}
            fallback={
              <>
                <GlyphSkeleton />
                <GlyphSkeleton />
                <GlyphSkeleton />
                <GlyphSkeleton />
                <GlyphSkeleton />
                <GlyphSkeleton />
                <GlyphSkeleton />
              </>
            }
          >
            <For each={parsed()!.groups}>
              {(group) =>
                group.glyphs.length > 0 ? <GlyphGroup group={group} /> : null
              }
            </For>
          </Show>
          <div ref={sentinelRef} class={styles.sentinel} />
        </div>
        <footer
          class={styles.footer}
          classList={{ [styles.bordered]: hasContentBelow() }}
        >
          <Button
            kind="secondary"
            loading={exporting()}
            disabled={!canExport()}
            onClick={handleExport}
          >
            Export {base()!.name}
          </Button>
          <Button
            kind="primary"
            loading={exportingAll()}
            disabled={!canExportAll()}
            onClick={handleExportAll}
          >
            Export All
          </Button>
        </footer>
      </div>
    </Show>
  );
};
