// Browser timers can be delayed while a page is suspended. Check elapsed time
// again when it returns so a long-hidden player is not left running on return.
export function unloadWhenHidden(
  page: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>,
  unload: () => void,
  options: { delayMs?: number; now?: () => number } = {},
): () => void {
  const delay = options.delayMs ?? 60_000;
  const now = options.now ?? Date.now;
  let hiddenAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = true;
  const cleanup = () => {
    active = false;
    clearTimeout(timer);
    page.removeEventListener('visibilitychange', changed);
  };
  const finish = () => {
    if (!active) return;
    cleanup();
    unload();
  };
  const changed = () => {
    if (page.hidden) {
      hiddenAt = now();
      clearTimeout(timer);
      timer = setTimeout(finish, delay);
    } else {
      clearTimeout(timer);
      if (hiddenAt !== null && now() - hiddenAt >= delay) finish();
      hiddenAt = null;
    }
  };
  page.addEventListener('visibilitychange', changed);
  if (page.hidden) changed();
  return cleanup;
}
