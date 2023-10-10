export function tuple<T extends string[]>(...elements: T) {
  return elements
}

export function convertByte(bit: number, unit: string) {
  // 
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
