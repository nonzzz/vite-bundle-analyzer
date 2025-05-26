import { createRoot } from 'react-dom/client'
import { definePlugin, isContextMenuEvent } from 'squarified'
import type { LayoutModule, Plugin } from 'squarified'
import type { TreemapComponentInstance } from './component'
import { Menu } from './menu'
import type { MenuActionHandler } from './menu'

export const filterLayoutDataPlugin = definePlugin({
  name: 'filter:data',
  onModuleInit(modules) {
    // TODO: should be resolved in squarified
    const handler = (modules: LayoutModule[]) => {
      return modules.filter((m) => {
        if (!modules || !m.layout) { return true }

        if (m.layout.some((l) => Number.isNaN(l))) {
          return false
        }
        if (Array.isArray(m.children)) {
          m.children = handler(m.children)
          return true
        }
        return true
      })
    }
    this.instance.layoutNodes = handler(modules)
  }
})

export interface MenuRenderConfig {
  html: string
  action: string
}

export type DOMEvent = Parameters<Exclude<Plugin['onDOMEventTriggered'], undefined>>[3]

export function menuPlugin() {
  let menu: HTMLDivElement | null = null
  let reactRoot: ReturnType<typeof createRoot> | null = null
  let currentModule: LayoutModule | null = null
  let treemap: TreemapComponentInstance | null = null
  let domEvent: DOMEvent | null = null

  const onAction: MenuActionHandler = (action, module) => {
    if (!treemap) {
      console.warn('Treemap instance is not available for menu action')
      return
    }

    switch (action) {
      case 'zoom':
        treemap.zoom(module.node.id)
        break
      case 'close':
        break
      case 'reset':
        treemap.resize()
        break
    }
    reactRoot?.render(null)
    // @ts-expect-error safe operation
    domEvent?.emit('__exposed__', 'close:tooltip', { state: false })
  }

  return definePlugin({
    name: 'treemap:preset-menu',
    onLoad(treemapContext) {
      if (!menu) {
        menu = document.createElement('div')
        reactRoot = createRoot(menu)
        document.body.append(menu)
        treemap = treemapContext as TreemapComponentInstance
      }
    },
    onDOMEventTriggered(_, event, __, DOMEvent) {
      if (isContextMenuEvent(event)) {
        event.native.stopPropagation()
        event.native.preventDefault()
        if (!domEvent) {
          domEvent = DOMEvent
        }
        currentModule = DOMEvent.findRelativeNode({
          native: event.native,
          kind: undefined
        })

        if (reactRoot && menu && currentModule) {
          // @ts-expect-error safe operation
          DOMEvent.emit('__exposed__', 'close:tooltip', { state: true })
          reactRoot.render(
            <Menu
              x={event.native.clientX}
              y={event.native.clientY}
              currentModule={currentModule}
              onAction={onAction}
              container={menu}
            />
          )
        }
      }
    },
    onDispose() {
      if (!menu) { return }
      if (reactRoot) {
        reactRoot.unmount()
        reactRoot = null
      }
      menu = null
      domEvent = null
      treemap = null
    }
  })
}
