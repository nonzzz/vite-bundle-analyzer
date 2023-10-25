<template>
    <div>
      <p>vite-bundle-analyzer example</p>
      <p>{{ counter }}</p>
      <var-button size="mini" auto @click="clickHandler">Button</var-button>
    </div>
  </template>
  
  <script>
  import { defineComponent, ref, onMounted } from 'vue'
  
  export default defineComponent({
    setup() {
      const counter = ref(0)
  
      onMounted(() => {
        console.log('hello world')
      })
  
      const clickHandler = () => {
        console.log('hello world')
        counter.value += 1
      }
  
      return {
        clickHandler,
        counter,
      }
    }
  })
  </script>
  