import { createRoot } from 'react-dom/client'
import { definePlugin, flattenModule, isContextMenuEvent } from 'squarified'
import type { LayoutModule, Plugin } from 'squarified'
import type { TreemapComponentInstance } from './component'
import { Menu } from './menu'
import type { MenuActionHandler } from './menu'

export const filterLayoutDataPlugin = definePlugin({
  name: 'filter:data',
  onModuleInit(modules) {
    if (this.instance.caches.size > 0) {
      flattenModule(this.instance.data).forEach((m) => {
        if (!m.id) { return }
        const id = m.id as string
        if (this.instance.caches.has(id)) {
          this.instance.caches.delete(id)
        }
      })
    }
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

    if (module) {
      switch (action) {
        case 'zoom':
          treemap.zoom(module.node.id)
          break
        case 'reset':
          treemap.resize()
          break
        case 'details':
          // @ts-expect-error safe operation
          domEvent?.emit('__exposed__', 'show:details', { module })
          break
      }
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
      if (DOMEvent.stateManager.isInState('DRAGGING')) {
        // If dragging, do not show context menu
        onAction('close', null)
        return
      }

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
        // this.instance.render.ctx

        if (reactRoot && menu && currentModule) {
          // @ts-expect-error safe operation
          DOMEvent.emit('__exposed__', 'close:tooltip', { state: true })

          const canvasContext = this.instance.render.ctx

          reactRoot.render(
            <Menu
              x={event.native.clientX}
              y={event.native.clientY}
              currentModule={currentModule}
              onAction={onAction}
              container={menu}
              canvasContext={canvasContext}
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

export type OnModuleInitResult = Exclude<ReturnType<Exclude<Plugin['onModuleInit'], undefined>>, void>

export type ColorMappings = Exclude<OnModuleInitResult['colorMappings'], undefined>

export type ColorDecoratorResult = ColorMappings[keyof ColorMappings]

export function colorPlugin() {
  return definePlugin({
    name: 'treemap:module-color',
    onModuleInit(modules) {
      const colorMappings: ColorMappings = {}

      function assignColorsByWeight(
        mods: LayoutModule[],
        startAngle = 0,
        sweepAngle = Math.PI * 2,
        depth = 0
      ) {
        const totalWeight = mods.reduce((sum, m) => sum + m.node.weight, 0)

        for (const mod of mods) {
          const childSweepAngle = totalWeight ? (mod.node.weight / totalWeight * sweepAngle) : 0
          const midAngle = startAngle + childSweepAngle / 2

          colorMappings[mod.node.id] = angleToColor(midAngle, depth)

          if (mod.children && mod.children.length > 0) {
            assignColorsByWeight(mod.children, startAngle, childSweepAngle, depth + 1)
          }

          startAngle += childSweepAngle
        }
      }

      assignColorsByWeight(modules)

      return { colorMappings }
    }
  })
}

function angleToColor(hueAngle: number, depth = 0): ColorDecoratorResult {
  const baseHue = hueAngle * 180 / Math.PI
  const hue = (baseHue + depth * 30) % 360

  const baseSaturation = 0.6 + 0.4 * Math.max(0, Math.cos(hueAngle))
  const saturation = Math.max(30, Math.round(100 * baseSaturation) - depth * 2)

  const baseLightness = 0.5 + 0.2 * Math.max(0, Math.cos(hueAngle + Math.PI * 2 / 3))
  const lightness = Math.min(75, Math.round(100 * baseLightness) + depth * 0.5)

  return {
    mode: 'hsl',
    desc: {
      h: hue,
      s: saturation,
      l: lightness
    }
  }
}
