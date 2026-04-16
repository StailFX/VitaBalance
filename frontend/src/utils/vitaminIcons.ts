import { VITAMIN_FALLBACK_VISUAL, VITAMIN_VISUALS, type VitaminVisualConfig } from '../config/uiVisuals'

export function getVitaminIcon(code: string): VitaminVisualConfig {
  return VITAMIN_VISUALS[code] || VITAMIN_FALLBACK_VISUAL
}

export default VITAMIN_VISUALS
