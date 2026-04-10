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
  const [exportError, setExportError] = createSignal<
    { message: string; anchor: "all" | "font" } | undefined
  >(undefined);
  let sentinelRef!: HTMLDivElement;
  let errorPopoverRef!: HTMLDivElement;
  let exportAllRef!: HTMLButtonElement;
  let exportFontRef!: HTMLButtonElement;

  createEffect(() => {
    if (errorPopoverRef.isConnected && exportError()) {
      // The typing is not up to date and does not accept
      // the source parameter.
      // @ts-expect-error
      errorPopoverRef.showPopover({
        source: exportError()?.anchor === "all" ? exportAllRef : exportFontRef,
      });
    }
  });

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
    const b = base();
    const p = parsed();
    if (!b || !p) return 0;

    return Object.values(b.disabledCodePoints).filter((v) => v === true).length;
  });
  const glyphCount = createMemo(() => {
    const b = base();
    const p = parsed();
    if (!b || !p) return 0;
    let count = 0;
    for (const group of p.groups) {
      for (const glyph of group.glyphs) {
        if (!b.disabledCodePoints[glyph.codePoints.join(",")]) count++;
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
    setExportError(undefined);
    try {
      await exportSelectedFont();
    } catch (err) {
      setExportError({
        message: err instanceof Error ? err.message : "Export failed",
        anchor: "font",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    setExportError(undefined);
    try {
      await exportAllFonts();
    } catch (err) {
      setExportError({
        message: err instanceof Error ? err.message : "Export failed",
        anchor: "all",
      });
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <Show when={base()}>
      {(b) => (
        <div class={styles.table}>
          <header class={styles.header}>
            <h1
              classList={{
                [styles.parsed]: !!parsed(),
                pulse: isParsing(),
              }}
              style={{ "font-family": `"${b().id}", sans-serif` }}
            >
              {b().name}
            </h1>
            <Show when={parsed()}>
              {(p) => (
                <div class={styles.fontInfo}>
                  <div class={styles.fontMeta}>
                    {disabledGlyphsCount()
                      ? `${glyphCount()} / ${p().totalGlyphs}`
                      : glyphCount()}{" "}
                    glyphs
                    <span class={styles.fontFileSize}>
                      {formatFileSize(b().weight.original)}
                      {(() => {
                        const est = b().weight.estimated;
                        if (est === undefined) return null;
                        return (
                          <>
                            <span> → </span>
                            {formatFileSize(est)}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </Show>
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
              {(p) => (
                <For each={p().groups}>
                  {(group) =>
                    group.glyphs.length > 0 ? (
                      <GlyphGroup font={b()} parsed={p()} group={group} />
                    ) : null
                  }
                </For>
              )}
            </Show>
            <div ref={sentinelRef} class={styles.sentinel} />
          </div>
          <footer
            class={styles.footer}
            classList={{ [styles.bordered]: hasContentBelow() }}
          >
            <Show when={hasMultipleFonts()}>
              <Button
                class={styles.copySelection}
                kind="secondary"
                disabled={!canCopySelection()}
                onClick={() => copySelectionToAllFonts(b().id)}
              />
            </Show>
            <div class={styles.footerActions}>
              <Button
                ref={exportFontRef}
                data-label={`Export ${b().name}`}
                class={styles.exportFont}
                classList={{
                  failed: exportError()?.anchor === "font",
                }}
                kind="secondary"
                loading={exporting()}
                disabled={!canExport()}
                onClick={handleExport}
              />
              <Button
                ref={exportAllRef}
                kind="primary"
                classList={{
                  failed: exportError()?.anchor === "all",
                }}
                loading={exportingAll()}
                disabled={!canExportAll()}
                onClick={handleExportAll}
              >
                Export All
              </Button>
            </div>
            <div popover ref={errorPopoverRef} class={styles.error}>
              {exportError()?.message}
            </div>
          </footer>
        </div>
      )}
    </Show>
  );
};
