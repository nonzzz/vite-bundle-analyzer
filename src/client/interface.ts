export type Module = typeof window['analyzeModule'][number]

export type Sizes = keyof Pick<Module, 'gzipSize' | 'statSize' | 'parsedSize'>
