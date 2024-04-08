import { useEffect, useState } from 'react'

function getId() {
  return Math.random().toString(32).slice(2, 10)
}

function createElement(id: string) {
  const el = document.createElement('div')
  el.setAttribute('id', id)
  return el
}

export function usePortal(
  selectId: string = getId(),
  getContainer?: () => HTMLElement | null
): HTMLElement {
  const id = `analyzer-plugin-${selectId}`
  const [elSnapshot, setElSnapshot] = useState<HTMLElement>(() => createElement(id))

  useEffect(() => {
    const customContainer = getContainer ? getContainer() : null
    const parentElement = customContainer || document.body
    const hasElement = parentElement.querySelector<HTMLElement>(`#${id}`)
    const el = hasElement || createElement(id)

    if (!hasElement) {
      parentElement.appendChild(el)
    }
    setElSnapshot(el)
  }, [])

  return elSnapshot
}
