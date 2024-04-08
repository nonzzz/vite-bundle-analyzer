import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0
  },
  height: (lineHeight) => ({
    lineHeight
  })
})

export function Ellipsis({ children, height }: { children: React.ReactNode, height: string }) {
  return <span {...stylex.props(styles.ellipsis, styles.height(height))}>{children}</span>
}
