import { Foram } from 'src/server/interface'
import { DefaultSizes } from '../server/interface'

declare global {
    interface Window {
        defaultSizes: DefaultSizes
        foramModule: Array<Foram>
    }
}

