/** Phase-lock every CSS animation under `root` to the document timeline, so backgrounds mounted at different moments (or in different outputs of one page) stay in step. */
export function syncAnimations(root: HTMLElement | null) {
  for (const a of root?.getAnimations({ subtree: true }) ?? []) a.startTime = 0
}
