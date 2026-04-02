export function getChartColors(dark) {
  return {
    grid: dark ? '#374151' : '#e5e7eb',
    axis: dark ? '#d1d5db' : '#6b7280',
    axisLine: dark ? '#6b7280' : '#9ca3af',
    tooltipBg: dark ? '#1f2937' : 'white',
    tooltipBorder: dark ? '#374151' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#111827',
  }
}
