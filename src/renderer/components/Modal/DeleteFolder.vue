<template>
  <div class="modal-content p-4">
    <div class="header">
      <h3>
        Are you sure you want to remove all data asociated with
        <b> {{ payload.path }} </b>?
      </h3>
    </div>
    <div class="modal-body light">
      You can delete all data or just remove it from the list
    </div>
    <div class="modal-controls df global-center">
      <button class="button" @click="removeFromList">Remove from list</button>
      <button class="button cancel" @click="deleteAll">Delete all data</button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  computed: {
    payload() {
      return this.$store.state.SharedStates.modal.options.payload
    }
  },
  methods: {
    async removeFromList() {},
    async deleteAll() {}
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

h3 {
  margin-block-end: 0.5em;
}
</style>
