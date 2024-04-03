import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useScale, withScale } from '@geist-ui/core'
import * as stylex from '@stylexjs/stylex'
import { SCALES } from '../button'
import { CheckboxProvider } from './context'

interface Props {
  value: string[]
  disabled?: boolean
  onChange?: (values: string[]) => void
}

export type CheckboxGroupProps = Props & Omit<React.HTMLAttributes<any>, keyof Props>

const defaultProps: Props = {
  disabled: false,
  value: []
}

const styles = stylex.create({
  group: (scale: SCALES) => ({
    width: scale.width(1, 'auto'),
    height: scale.height(1, 'auto'),
    padding: `${scale.pt(0)} ${scale.pr(0)} ${scale.pb(0)} ${scale.pl(0)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`,
    ':not(#__unused__) label': {
      marginRight: `calc(${scale.font(1)} * 2)`,
      '--checkbox-size': scale.font(1)
    },
    ':not(#__unused__) label:last-of-type': {
      marginRight: 0
    }
  })
})

function CheckboxGroupComponent(props: React.PropsWithChildren< CheckboxGroupProps>) {
  const { children, value, disabled = false, onChange, ...rest } = props
  const { SCALES } = useScale()
  const [selfValue, setSelfValue] = useState<string[]>([])

  const updateState = useCallback((val: string, checked: boolean) => {
    const removed = selfValue.filter(v => v !== val)
    const next = checked ? [...removed, val] : removed
    setSelfValue(next)
    onChange?.(next)
  }, [selfValue, onChange])

  useEffect(() => {
    setSelfValue([...value])
  }, [value])

  const contextValue = useMemo(() => {
    return {
      disabledAll: disabled,
      values: selfValue,
      inGroup: true,
      updateState
    }
  }, [disabled, selfValue, updateState])

  return (
    <CheckboxProvider value={contextValue}>
      <div {...stylex.props(styles.group(SCALES))} {...rest}>
        {children}
      </div>
    </CheckboxProvider>
  )
}

CheckboxGroupComponent.defaultProps = defaultProps
CheckboxGroupComponent.displayName = 'CheckboxGroup'

export const CheckboxGroup = withScale(CheckboxGroupComponent)
