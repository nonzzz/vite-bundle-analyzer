import { PropsWithChildren } from 'react'
import style9 from 'style9'
import { Spacer, Text } from '@geist-ui/core'
import { convertBytes, noop } from '../shared'

export interface ModuleItemProps {
  name: string,
  size?: number | null,
  className?: string,
  pointer?: boolean,
  onClick?: () => void,
  onMouseEnter?: () => void,
}

const styles = style9.create({
  textContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  text: {
    flex: '1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
})

export function ModuleItem(opts: PropsWithChildren<ModuleItemProps>) {
  const { name, size = null, pointer = false, children, className, onClick = noop, onMouseEnter = noop } = opts
  return (
    <Text
      span
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={className}
      style={{ cursor: pointer ? 'pointer' : 'inherit' }}
    >
      <div className={styles('textContainer')}>
        {children}
        <div className={styles('text')}>
          {name}
        </div>
        {
                    size !== null && (
                      <Text b>
                        (
                        {convertBytes(size)}
                        )
                      </Text>
                    )
                }
      </div>
      <Spacer h={0.5} />
    </Text>
  )
}
