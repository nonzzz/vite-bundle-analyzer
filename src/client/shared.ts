export function tuple<T extends string[]>(...elements: T) {
  return elements
}

export function convertBytes(bit: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = parseInt(`${Math.floor(Math.log(bit) / Math.log(1024))}`)
  const converted = bit / (1 << (i * 10)) 
  return converted.toFixed(2) + ' ' + sizes[i]
}

export function pick<T extends object, A extends keyof T>(data: T, attrs: A[]) {
  return attrs.reduce((acc, cur) => ((acc[cur] = data[cur]), acc), {} as Pick<T, A>)
}

export function omit<T extends object, K extends keyof T>(data: T, attrs: K[]) {
  return (Object.keys(data) as K[]).reduce(
    (acc, cur) => (attrs.includes(cur) ? acc : Object.assign(acc, { [cur]: data[cur] })),
    {} as Omit<T, K>
  )
}
