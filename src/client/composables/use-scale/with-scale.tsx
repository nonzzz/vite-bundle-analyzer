// @ts-nocheck
import React, { forwardRef } from 'react'
import { DynamicLayoutPipe, ScaleConfig, ScaleContext, ScaleProps } from './scale-context'
import { generateGetAllScaleProps, generateGetScaleProps } from './utils'

function isCSSNumberValue(value?: string | number) {
  return value !== undefined && !Number.isNaN(+value)
}

function reduceScaleCoefficient(scale: number) {
  if (scale === 1) return scale
  const diff = Math.abs((scale - 1) / 2)
  return scale > 1 ? 1 + diff : 1 - diff
}

export const withScale = <T, P = {}>(
  Render: React.ComponentType<P & { ref?: React.Ref<T> }> | React.ForwardRefExoticComponent<P>
) => {
  const ScaleFC = forwardRef<T, P & React.PropsWithChildren<ScaleProps>>(({ children, ...props }, ref) => {
    const {
      paddingLeft,
      pl,
      paddingRight,
      pr,
      paddingTop,
      pt,
      paddingBottom,
      pb,
      marginTop,
      mt,
      marginRight,
      mr,
      marginBottom,
      mb,
      marginLeft,
      ml,
      px,
      py,
      mx,
      my,
      width,
      height,
      font,
      w,
      h,
      margin,
      padding,
      unit = '16px',
      scale = 1,
      ...innerProps
    } = props
    const makeScaleHandler =
      (attrValue: string | number | undefined): DynamicLayoutPipe =>
        (scale1x, defaultValue) => {
        // 0 means disable scale and the default value is 0
          if (scale1x === 0) {
            scale1x = 1
            defaultValue = defaultValue || 0
          }
          const factor = reduceScaleCoefficient(scale) * scale1x
          if (typeof attrValue === 'undefined') {
            if (typeof defaultValue !== 'undefined') return `${defaultValue}`
            return `calc(${factor} * ${unit})`
          }

          if (!isCSSNumberValue(attrValue)) return `${attrValue}`
          const customFactor = factor * Number(attrValue)
          return `calc(${customFactor} * ${unit})`
        }

    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const value: ScaleConfig = {
      unit,
      SCALES: {
        pt: makeScaleHandler(paddingTop ?? pt ?? py ?? padding),
        pr: makeScaleHandler(paddingRight ?? pr ?? px ?? padding),
        pb: makeScaleHandler(paddingBottom ?? pb ?? py ?? padding),
        pl: makeScaleHandler(paddingLeft ?? pl ?? px ?? padding),
        px: makeScaleHandler(px ?? paddingLeft ?? paddingRight ?? pl ?? pr ?? padding),
        py: makeScaleHandler(py ?? paddingTop ?? paddingBottom ?? pt ?? pb ?? padding),
        mt: makeScaleHandler(marginTop ?? mt ?? my ?? margin),
        mr: makeScaleHandler(marginRight ?? mr ?? mx ?? margin),
        mb: makeScaleHandler(marginBottom ?? mb ?? my ?? margin),
        ml: makeScaleHandler(marginLeft ?? ml ?? mx ?? margin),
        mx: makeScaleHandler(mx ?? marginLeft ?? marginRight ?? ml ?? mr ?? margin),
        my: makeScaleHandler(my ?? marginTop ?? marginBottom ?? mt ?? mb ?? margin),
        width: makeScaleHandler(width ?? w),
        height: makeScaleHandler(height ?? h),
        font: makeScaleHandler(font)
      },
      getScaleProps: generateGetScaleProps(props),
      getAllScaleProps: generateGetAllScaleProps(props)
    }

    return (
      <ScaleContext.Provider value={value}>
        <Render {...(innerProps as P)} ref={ref}>
          {children}
        </Render>
      </ScaleContext.Provider>
    )
  })
  ScaleFC.displayName = `Scale${Render.displayName || 'Wrapper'}`
  return ScaleFC
}
