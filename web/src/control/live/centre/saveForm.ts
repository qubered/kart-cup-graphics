// Is the "Save as new" form open? Centre opens it, SceneEditor shows it in place of the scene editor (the library stays visible).
import { writable } from 'svelte/store'

export const saveOpen = writable(false)
