<template>
  <Card :item="item" @click="emit('clicked')">
    <template #default>
      <div class="folder-container">
        <div class="content">
          <div class="left">
            <div
              class="round-img"
              :style="{ backgroundImage: item.backgroundImage }"
            />
          </div>
          <div class="right" />
          <div class="bottom w100 df global-center">
            <div class="folder-path">{{ path }}</div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import Card from '../Home/Generic/Card.vue'

defineOptions({ name: 'FolderCard' })

type Props = {
  path: string
  index: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ clicked: [] }>()
const item = computed(() => ({
  backgroundImage: `url(https://picsum.photos/50${props.index})`
}))
</script>

<style lang="scss" scoped>
.folder-container {
  box-sizing: border-box;
  padding: 0.5em;
  display: flex;
}

.card-container {
  min-width: fit-content;
  --borr: 0.5em;
}
</style>
