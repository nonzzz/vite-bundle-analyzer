import { ChangeEvent, useMemo, useState } from 'react'
import type { Sizes } from '../interface'
import { convertBytes, uniqBy } from '../shared'
import { useTreemapContext } from '../context'
import { findRelativeModuleByFilename, flattenModules } from '../components/treemap/shared'
import type { Module } from './treemap'
import { Text } from './text'
import { Spacer } from './spacer'
import { Input } from './input'
import { ModuleItem } from './module-item'
import Folder from '~icons/ph/folder'
import File from '~icons/ph/file-duotone'

export interface SearchModulesProps {
  files: Module[]
  extra: Sizes
}

function extension(filename: string) {
  const match = filename.match(/\.([^.]+)$/)
  return match ? `${match[1]}` : ''
}

type ExcludeGroupsModule = Omit<Module, 'groups'>

type FilterModule = ExcludeGroupsModule & {
  isDirectory: boolean
}

export function SearchModules(props: SearchModulesProps) {
  const { treemap } = useTreemapContext()

  const { extra, files } = props

  const [regExp, setRegExp] = useState<RegExp | null>()
  const [availableMap, setAvailableMap] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (!regExp) {
      return []
    }
    const filtered = files.map((module) => {
      return {
        parent: module,
        children: uniqBy(
          flattenModules(module.groups).filter(m => regExp.test(m.label))
            .map(m => ({
              ...m,
              isDirectory: extension(m.label) ? false : true
            })) as Omit<Module, 'groups'>[],
          'label'
        )
          .sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1
            return b[extra] - a[extra]
          }) as FilterModule[]
      }
    })
    return filtered
  }, [regExp, files, extra])

  const findModulesSize = useMemo(
    () => filtered.reduce((acc, module) => acc + module.parent[extra], 0),
    [filtered, extra]
  )

  const handleChangeRegExp = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    try {
      setRegExp(value.length ? new RegExp(value, 'iu') : null)
    } catch (error) {
      setRegExp(null)
    }
  }

  const handleMouseEnter = (module: FilterModule) => {
    setAvailableMap({
      ...availableMap,
      [module.label]: true
    })
  }

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
            Count:
            <strong>
              {filtered.length}
            </strong>
          </span>
          <Spacer inline />
          <span>
            Total size:
            <strong>
              {convertBytes(findModulesSize)}
            </strong>
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
                    onMouseEnter={() => handleMouseEnter(child)}
                    onClick={() => treemap.current?.zoom(findRelativeModuleByFilename(module.parent, child.filename)!)}
                    stylex={{ fontStyle: 'italic' }}
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
