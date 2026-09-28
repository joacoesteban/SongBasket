<template>
  <div v-if="playlist" class="container">
    <div class="header">
      Are you sure you want to unsync
      <span class="bold"> {{ playlist.name }} </span>?
    </div>
    <div class="info light">
      {{ playlist.tracks.total }} tracks will be deleted from your Hard Drive
    </div>
    <div class="controls df jucc aliic">
      <div class="button accept" @click="accept">Yes</div>
      <div class="button cancel" @click="$emit('close')">No</div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  computed: {
    payload() {
      return this.$store.state.SharedStates.modal.options.payload
    },
    id() {
      return this.payload.id
    },
    playlist() {
      return this.$store.getters.PlaylistById(this.id)
    }
  },
  methods: {
    async accept() {
      await this.$root.$controllers.core.unsyncPlaylist(this.id)
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info {
  font-size: 0.7em;
}

.controls {
  margin-top: 1em;

  .button {
    margin: 0 0.3em;
    width: 5em;
  }
}
</style>
