import { injectGlobalStyle } from '@stylex-extend/core'

injectGlobalStyle({
  '#app,html,body': {
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    height: '100%',
    width: '100%'
  },
  p: {
    margin: 0
  },
  'button,input,select,textarea': {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    margin: 0,
    '&:focus': {
      outline: 'none'
    }
  }
})
