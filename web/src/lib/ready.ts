export async function whenReady(imageUrls: string[], timeoutMs = 3000): Promise<void> {
  const work = (async () => {
    try { await document.fonts.ready } catch { /* ignore */ }
    await Promise.all(
      imageUrls.map(async (u) => {
        try {
          const img = new Image()
          img.src = u
          await img.decode()
        } catch { /* ignore broken images */ }
      }),
    )
  })()
  await Promise.race([work, new Promise<void>((r) => setTimeout(r, timeoutMs))])
}
