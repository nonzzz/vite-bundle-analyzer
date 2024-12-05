import { ChangeEvent, useCallback, useMemo, useState } from 'react'
import { flattenModule } from 'squarified'
import File from '~icons/ph/file-duotone'
import Folder from '~icons/ph/folder'
import { useTreemapContext } from '../context'
import type { Module, Sizes } from '../interface'
import { convertBytes, uniqBy } from '../shared'
import { Input } from './input'
import { ModuleItem } from './module-item'
import { Spacer } from './spacer'
import { Text } from './text'

export interface SearchModulesProps<F> {
  files: F[]
  extra: Sizes
}

type FilterModule = Omit<Module, 'groups'> & {
  isDirectory: boolean
}

export function SearchModules<F extends Module>(props: SearchModulesProps<F>) {
  const { treemap } = useTreemapContext()

  const { extra, files } = props

  const [regExp, setRegExp] = useState<RegExp | null>()
  const [availableMap, setAvailableMap] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (!regExp) {
      return []
    }
    return files.map((module) => {
      return {
        parent: module,
        children: uniqBy(
          flattenModule(
            module.groups
          ).filter((m) => regExp.test(m.label)).map((m) => {
            return ({ ...m, isDirectory: !/\.(\w+)$/.test(m.label) })
          }),
          'label'
        ).sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) { return -1 }
          if (!a.isDirectory && b.isDirectory) { return 1 }
          return b[extra] - a[extra]
        })
      }
    })
  }, [regExp, files, extra])

  const findModulesSize = useMemo(
    () => filtered.reduce((acc, module) => acc + module.parent[extra], 0),
    [filtered, extra]
  )

  const handleChangeRegExp = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    try {
      setRegExp(value.length ? new RegExp(value, 'iu') : null)
    } catch {
      setRegExp(null)
    }
  }

  const handleMouseEnter = (module: FilterModule) => {
    setAvailableMap({
      ...availableMap,
      [module.label]: true
    })
  }

  const handleFocusModule = useCallback((filename: string) => {
    treemap.current?.zoom(filename)
  }, [treemap])

  return (
    <>
      <Input
        placeholder="Enter RegExp"
        clearable
        width="100%"
        onChange={handleChangeRegExp}
      />
      <Spacer h={0.75} />
      {!!filtered.length && (
        <div>
          <span>
            Count: <strong>{filtered.length}</strong>
          </span>
          <Spacer inline />
          <span>
            Total size:<strong>{convertBytes(findModulesSize)}</strong>
          </span>
        </div>
      )}
      <Spacer />
      {filtered.length
        ? (
          <>
            {filtered.map((module) => (
              <div key={module.parent.label}>
                <ModuleItem name={module.parent.label} stylex={{ fontStyle: 'bold' }} />
                {module.children.map((child) => (
                  <ModuleItem
                    key={child.label}
                    name={child.label}
                    size={child[extra]}
                    pointer={availableMap[child.label]}
                    stylex={{ fontStyle: 'italic' }}
                    onMouseEnter={() => handleMouseEnter(child)}
                    onClick={() => handleFocusModule(child.label)}
                  >
                    {child.isDirectory ? <Folder /> : <File />}
                    <Spacer inline />
                  </ModuleItem>
                ))}
              </div>
            ))}
          </>
        )
        : (
          <div stylex={{ textAlign: 'center' }}>
            <Text span b width="100%">
              &quot;No modules found&quot;
            </Text>
          </div>
        )}
    </>
  )
}
