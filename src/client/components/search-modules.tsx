import { ChangeEvent, useMemo, useState } from 'react'
import stylex from '@stylexjs/stylex'
import { Spacer, Text } from '@geist-ui/core'
import Folder from '@geist-ui/icons/folder'
import File from '@geist-ui/icons/file'
import type { Foam, Sizes } from '../interface'
import { convertBytes, uniqBy } from '../shared'
import { useApplicationContext } from '../context'
import { Input } from './input'
import { ModuleItem } from './module-item'

export interface SearchModulesProps {
  files: Foam[]
  extra: Sizes
}

const styles = stylex.create({
  foamName: {
    fontWeight: 'bold'
  },
  moduleName: {
    fontStyle: 'italic'
  },
  noFoundMessage: {
    textAlign: 'center'
  }
})

export function SearchModules(props: SearchModulesProps) {
  const { treemap } = useApplicationContext()

  const { extra, files } = props

  const [regExp, setRegExp] = useState<RegExp | null>()
  const [availableMap, setAvailableMap] = useState<Record<string, boolean>>({})

  const filtered = useMemo<{ foam: Foam, modules: Foam[] }[]>(() => {
    if (!regExp) {
      return []
    }
    return files
      .map(foam => {
        const flatModules = (module: Foam): Foam[] => (module.groups?.flatMap(flatModules) || []).concat(module)

        const modules = flatModules(foam)
          .filter(module => regExp.test(module.id))
          .sort((a, b) => b[extra] - a[extra])
          .reduce((acc, module) => {
            const group = !module.groups?.length ? 0 : 1
            acc[group].push(module)
            return acc
          }, [[], []] as [Foam[], Foam[]])
          .flat()

        return {
          foam,
          modules: uniqBy(modules, 'id')
        }
      })
      .filter(find => find.modules.length)
      .sort((a, b) => a.modules.length - b.modules.length)
  }, [regExp, files, extra])

  const findModules = useMemo(() => filtered.reduce<Foam[]>((acc, find) => acc.concat(find.modules), []), [filtered])

  const findModulesSize = useMemo(() => findModules.reduce((acc, module) => acc + module[extra], 0), [findModules, extra])

  const handleChangeRegExp = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    try {
      setRegExp(value.length ? new RegExp(value, 'iu') : null)
    } catch (error) {
      setRegExp(null)
    }
  }

  const handleMouseEnter = (module: Foam) => {
    const check = treemap.current?.check(module)
    setAvailableMap({
      ...availableMap,
      [module.id]: !!check
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
      {
                !!filtered.length && (
                  <div>
                    <span>
                      Count:
                      {' '}
                      <strong>{filtered.length}</strong>
                    </span>
                    <Spacer inline />
                    <span>
                      Total size:
                      {' '}
                      <strong>{convertBytes(findModulesSize)}</strong>
                    </span>
                  </div>
                )
            }
      <Spacer />
      {
                filtered.length
                  ? filtered.map(find => (
                    <div key={find.foam.id}>
                      <ModuleItem
                        name={find.foam.label}
                        {...stylex.props(styles.foamName)}
                      />
                      <div>
                        {find.modules.map(module => (
                          <ModuleItem
                            key={module.id}
                            name={module.id}
                            size={module[extra]}
                            pointer={availableMap[module.id]}
                            onMouseEnter={() => handleMouseEnter(module)}
                            onClick={() => treemap.current?.zoom(module)}
                            {...stylex.props(styles.moduleName)}
                          >
                            {module.groups?.length ? <File size={14} /> : <Folder size={14} />}
                            <Spacer inline />
                          </ModuleItem>
                        ))}
                      </div>
                    </div>
                  ))
                  : (
                    <div {...stylex.props(styles.noFoundMessage)}>
                      <Text span b width="100%">&quot;No modules found&quot;</Text>
                    </div>
                    )
            }
    </>
  )
}
