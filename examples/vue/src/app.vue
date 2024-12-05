<template>
  <div>
    <p>vite-bundle-analyzer example</p>
    <p>{{ counter }}</p>
    <var-button size="mini" auto @click="clickHandler">Button</var-button>
    <SyncComponent />
    <AsyncComponent />
  </div>
</template>

<script>
import { defineAsyncComponent, defineComponent, onMounted, ref } from 'vue'
import SyncComponent from './sync-component.vue'
import { send } from './worker'

export default defineComponent({
  components: {
    SyncComponent,
    AsyncComponent: defineAsyncComponent(() => import('./async-component.vue'))
  },
  setup() {
    const counter = ref(0)

    onMounted(() => {
      console.log('hello world')
    })

    const clickHandler = () => {
      console.log('hello world')
      counter.value += 1
      send()
    }

    return {
      clickHandler,
      counter
    }
  }
})
</script>
