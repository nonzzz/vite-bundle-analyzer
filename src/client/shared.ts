export function tuple<T extends string[]>(...elements: T) {
  return elements
}

export function noop() { /** noop**/ }

export function convertBytes(bit: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (!bit) return 0 + ' ' + sizes[0]
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

export function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    hash = (hash << 5) - hash + code
    hash = hash & hash
  }
  return hash
}

export function exists(value: unknown): boolean {
  return value !== null && value !== undefined;
}


type PredicateFunction<T> = (value: T) => any;

export function uniqBy<T, K extends keyof T = keyof T>(array: T[], predicate: K | PredicateFunction<T>): T[] {
  const predicateFn = typeof predicate === 'function' ? predicate : ((value: T) => value[predicate]);
  const uniq = array.reduce((acc, value) => {
    const key = <K>predicateFn(value);
    if (!exists(acc[key])) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<K, T>);
  return Object.values(uniq);
}
