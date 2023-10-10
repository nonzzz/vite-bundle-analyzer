import { Module } from 'src/server/module'
import { DefaultSizes } from '../server/interface'

declare global {
    type PrettyModule = Awaited<ReturnType<Module['pretty']>>[number]
    interface Window {
        defaultSizes: DefaultSizes
        prettyModule: Array<Omit<PrettyModule, 'chilren'> & Partial<Pick<PrettyModule, 'children'>>>
    }
}
