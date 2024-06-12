import { Drawer as _Drawer } from './drawer'
import { DrawerContent } from './content'

export type DrawerComponentType = typeof _Drawer & {
  Content: typeof DrawerContent
}
;(_Drawer as DrawerComponentType).Content = DrawerContent

export const Drawer = _Drawer as DrawerComponentType
