export function convertBytes(bit: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (!bit) return 0 + ' ' + sizes[0]
  const i = parseInt(`${Math.floor(Math.log(bit) / Math.log(1024))}`)
  const converted = bit / (1 << (i * 10))
  return converted.toFixed(2) + ' ' + sizes[i]
}
