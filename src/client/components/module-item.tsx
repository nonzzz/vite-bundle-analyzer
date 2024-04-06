import { PropsWithChildren } from 'react'
import stylex from '@stylexjs/stylex'
import { noop } from 'foxact/noop'
import { convertBytes } from '../shared'
import { Text } from './text'
import { Spacer } from './spacer'

export interface ModuleItemProps {
  name: string,
  size?: number | null,
  className?: string,
  pointer?: boolean,
  onClick?: () => void,
  onMouseEnter?: () => void,
}

const styles = stylex.create({
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
      <div {...stylex.props(styles.textContainer)}>
        {children}
        <div {...stylex.props(styles.text)}>
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
