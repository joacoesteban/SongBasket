import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { createSongBasketState, songBasketStateKey } from './state'

const appState = createSongBasketState()
const app = createApp(App)

app.use(router)
app.provide(songBasketStateKey, appState)
app.mount('#app')

export default app
