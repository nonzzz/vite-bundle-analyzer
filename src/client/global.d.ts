import { Module } from 'src/server/module'
import { DefaultSizes } from '../server/interface'

declare global {
    type PrettyModule = Awaited<ReturnType<Module['pretty']>>[number]
    interface Window {
        defaultSizes: DefaultSizes
        prettyModule: Array<Omit<PrettyModule, 'children'> & Partial<Pick<PrettyModule, 'children'>>>
    }
}

