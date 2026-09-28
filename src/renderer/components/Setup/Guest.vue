<template>
  <div
    :class="loadingState === 'Loading' ? 'loading' : 'doneloading'"
    class="df fldc global-center alt"
  >
    <button class="button slim" @click="$emit('backLogin')">
      Log in instead
    </button>
    <!-- <div class="top">
              <div class="radio-label">
                <span @click="changeMode(0)">Username</span>
              </div>
              <div
              @click="changeMode(null)"
              class="radio-container">
                <div
                :class="{'left': mode === 0, 'right': mode === 1}"
                class="radio-thumb"></div>
              </div>
              <div class="radio-label">
                <span @click="changeMode(1)">Playlist ID</span>
              </div>
            </div> -->

    <div class="mid">
      <input
        ref="guestSearchInput"
        v-model.trim="userQuery"
        class="std-input guest-search-box"
        type="text"
        @keyup.enter.prevent="guestSearch"
      />
    </div>

    <div class="bot">
      <div v-if="loadingState !== null" class="loading-state-indicator">
        {{ loadingState }}
      </div>
      <button class="button button-wide" @click="guestSearch">Search</button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      userQuery: '',
      mode: 0,
      lastmode: 0
    }
  },
  computed: {
    loadingState() {
      const x = this.$store.state.SharedStates.loadingState
      switch (x) {
        case 'loading':
          return 'Loading'
        case 'not found':
          return !this.lastmode ? 'User not Found' : 'Playlist not Found'
        case 'invalid id':
          return 'Invalid ID'
        case 'found':
          return null
        default:
          return null
      }
    }
  },
  mounted() {
    // this.focusInput()
  },
  methods: {
    guestSearch() {
      this.lastmode = this.mode
      this.$emit('guestSearch', {
        query: this.userQuery,
        mode: this.mode ? 'playlist' : 'user'
      })
    },
    changeMode(mode) {
      if (mode === null) this.mode = this.mode === 0 ? 1 : 0
      else this.mode = mode

      this.focusInput()
    },
    focusInput() {
      this.$refs.guestSearchInput.focus()
    }
  }
}
</script>

<style lang="scss" scoped>
.alt {
  @keyframes shiftbackground {
    0% {
      background: var(--dark-body);
    }

    50% {
      background: rgb(139, 80, 52);
    }

    100% {
      background: var(--dark-body);
    }
  }

  // z-index: -1;
  flex-direction: column;
  justify-content: space-evenly;

  &.loading {
    animation: shiftbackground 3s ease-in-out infinite;
  }
}

.top {
  display: flex;
  justify-content: center;
  align-items: center;
}

.radio-label {
  min-width: 7rem;
}

.radio-container {
  $time: 5s;
  $curve: cubic-bezier(0.07, 0.98, 0.23, 1);

  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 2.7rem;
  min-height: 1.5rem;
  background: var(--text-white);
  border-radius: 500px;

  &:hover {
    .radio-thumb {
      transform: scale(1.1);
    }
  }
}

.radio-thumb {
  @keyframes goright {
    0% {
      left: 13%;
    }

    100% {
      left: 52%;
    }
  }

  @keyframes goleft {
    0% {
      left: 52%;
    }

    100% {
      left: 13%;
    }
  }

  $time: 0.15s;
  $curve: cubic-bezier(0.79, 0.74, 0.26, 0.96);

  transition: transform $time $curve;

  position: absolute;
  width: 1rem;
  height: 1rem;
  background: var(--button-purple);
  border-radius: 500px;

  &.left {
    animation: goleft $time $curve;
    left: 13%;
  }

  &.right {
    animation: goright $time $curve;
    left: 52%;
  }
}

.guest-search-box {
  padding-bottom: 1rem;
  font-size: 3rem;
}

.bot {
  position: relative;
}

.button-wide {
  min-width: 15rem;
  z-index: 0;
}

.loading-state-indicator {
  z-index: -1;
  color: var(--text-white);
  position: absolute;
  bottom: 2.5rem;
  left: 0;
  right: 0;
  font-size: 1.1rem;
}
</style>
