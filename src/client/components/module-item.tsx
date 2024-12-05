import { noop } from 'foxact/noop'
import { PropsWithChildren } from 'react'
import { convertBytes } from '../shared'
import { Spacer } from './spacer'
import { Text } from './text'

export interface ModuleItemProps {
  name: string
  size?: number | null
  className?: string
  pointer?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
}

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
      <div
        stylex={{
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {children}
        <div
          stylex={{
            flex: '1',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {name}
        </div>
        {size !== null && (
          <Text b>
            (
            {convertBytes(size)}
            )
          </Text>
        )}
      </div>
      <Spacer h={0.5} />
    </Text>
  )
}
