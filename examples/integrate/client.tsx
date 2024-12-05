/* eslint-disable react-compiler/react-compiler */
export function SideBar() {
  const { useState } = window.React

  const [count, setCount] = useState(0)

  return (
    <div>
      <p>I'm custom Side Bar!!!</p>
      <p>{count}</p>

      <button
        type="button"
        onClick={() => {
          setCount((pre) => pre + 1)
        }}
      >
        click Me!!
      </button>
    </div>
  )
}

export function Main() {
  return <div>Custom Main</div>
}
