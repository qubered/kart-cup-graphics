const loaded = new Set<string>()

export async function loadUploadedFonts(fonts: { family: string; file: string }[]): Promise<void> {
  await Promise.all(
    fonts.map(async (f) => {
      const key = `${f.family}|${f.file}`
      if (loaded.has(key)) return
      loaded.add(key)
      try {
        const face = new FontFace(f.family, `url(/uploads/fonts/${encodeURIComponent(f.file)})`)
        await face.load()
        document.fonts.add(face)
      } catch {
        loaded.delete(key)
      }
    }),
  )
}
