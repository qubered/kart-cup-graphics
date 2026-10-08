import { mount } from 'svelte'
import '../lib/fonts.css'
import './styles.css'
import Control from './Control.svelte'
import { control } from './store'
import { loadUploadedFonts } from '../lib/uploaded-fonts'

let fontsKey = ''
control.subscribe((s) => {
  const fonts = s.payload?.state.uploadedFonts
  if (!fonts) return
  const key = JSON.stringify(fonts)
  if (key === fontsKey) return
  fontsKey = key
  void loadUploadedFonts(fonts)
})

mount(Control, { target: document.getElementById('app')! })
