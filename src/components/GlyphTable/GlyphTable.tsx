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
import { useCurrentFont } from "~/modules/fonts";
import {
  copySelectionToAllFonts,
  exportAllFonts,
  exportSelectedFont,
  store,
} from "~/modules/state";
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
  const glyphCount = createMemo(() => {
    if (!parsed()) return 0;
    let count = 0;
    for (const group of parsed()!.groups) {
      for (const glyph of group.glyphs) {
        if (!base()?.disabledCodePoints[glyph.codePoints.join(",")]) count++;
      }
    }
    return count;
  });

  const canExport = createMemo(() => parsed() && glyphCount() > 0);
  const canExportAll = createMemo(() =>
    store.fontOrder.every((id) => store.parsedFonts[id])
  );

  const hasMultipleFonts = createMemo(() => store.fontOrder.length > 1);

  const canCopySelection = createMemo(() => {
    const currentFont = base();
    if (!currentFont) return false;

    const otherIds = store.fontOrder.filter((id) => id !== currentFont.id);
    if (otherIds.length === 0) return false;

    const current = currentFont.disabledCodePoints;

    return otherIds.some((id) => {
      const other = store.fonts[id]?.disabledCodePoints;
      if (!other) return false;

      for (const [key, val] of Object.entries(current)) {
        if ((val === true) !== (other[key] === true)) return true;
      }
      for (const [key, val] of Object.entries(other)) {
        if ((val === true) !== (current[key] === true)) return true;
      }
      return false;
    });
  });

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
                  {formatFileSize(base()!.weight.original)}
                  {base()!.weight.estimated !== undefined && (
                    <>
                      <span> → </span>
                      {formatFileSize(base()!.weight.estimated!)}
                    </>
                  )}
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
          <Show when={hasMultipleFonts()}>
            <Button
              kind="secondary"
              disabled={!canCopySelection()}
              onClick={() => copySelectionToAllFonts(base()!.id)}
            >
              Apply Selection to All Fonts
            </Button>
          </Show>
          <div class={styles.footerActions}>
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
          </div>
        </footer>
      </div>
    </Show>
  );
};
