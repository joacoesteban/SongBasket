<template>
  <div class="track-review-container row">
    <Track
      :item="item"
      :is-reviewing="true"
    />

    <TrackResult
      v-for="(convItem, index) in conversions"
      :key="index"
      :is-selected="convItem === item.selectionObj"
      :item="convItem"
      :duration-color="durationColor(convItem)"
      @setSelection="setSelection(convItem)"
    />

    <div
      class="link-button"
      @click="selectCustomUrl"
    >
      Use Custom URL
    </div>
    <div
      class="link-button"
      @click="pauseTrack"
    >
      {{ item.flags.paused ? 'Unpause' : 'Pause' }} Track
    </div>
  </div>
</template>

<script lang="ts">
import Track from '../Home/PlaylistView/Track.vue'
import TrackResult from '../Home/PlaylistView/TrackResult.vue'
export default {
  components: {
    Track,
    TrackResult
  },
  props: {
    options: Object
  },
  computed: {
    item () {
      return this.options.tracks[this.options.index]
    },
    conversions () {
      return this.item.conversion.yt.concat(this.item.custom || [])
    },
    min () {
      let min = Math.abs(this.conversions[0].durationDiff)
      this.conversions.forEach(({ durationDiff }) => {
        durationDiff = Math.abs(durationDiff)
        if (durationDiff < min) min = durationDiff
      })
      return min
    },
    max () {
      let max = 0
      this.conversions.forEach(({ durationDiff }) => {
        durationDiff = Math.abs(durationDiff)
        if (durationDiff > max) max = durationDiff
      })
      return max
    }
  },
  mounted () {
    console.log(this.options)
  },
  methods: {
    durationColor ({ durationDiff }) {
      durationDiff = Math.abs(durationDiff)
      const deg = 150 - 150 * Math.abs(durationDiff / this.max)
      return `hsl(${deg}, 100%, 50%)`
    },
    selectCustomUrl () {
      this.$root.OPEN_MODAL({ wich: 'custom-track-url', payload: { trackId: this.item.id, playlistId: this.options.playlistId } })
    },
    async pauseTrack () {
      const id = this.item && this.item.id
      try {
        if (!id) throw new Error('NO TRACK ID')
        await this.$root.$controllers.core.pauseTrack(id)
      } catch (error) {
        console.error(error)
      }
    },
    async setSelection (item) {
      if (item.youtube_id === this.item.selectionObj.youtube_id && this.item.flags.selectionIsApplied) return
      let newId = item.youtube_id
      if (item.isCustomTrack) newId = false
      if (item.isBestMatch) newId = null

      try {
        await this.$root.$controllers.core.changeYtTrackSelection({ trackId: this.item.id, newId })
        this.$root.$controllers.track.populateTrackSelection(this.item)
      } catch (error) {
        console.error(error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.track-review-container {
  width: 90vw;
  box-sizing: border-box;
  padding: .5em;
}
</style>
