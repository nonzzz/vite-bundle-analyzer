export type Foam = typeof window['foamModule'][number]

export type Sizes = keyof Pick<Foam, 'gzipSize' | 'statSize' | 'parsedSize'>
