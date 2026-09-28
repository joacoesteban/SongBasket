import bootstrap from './bootstrap'
import { initializeEnvironment } from './environment-init'

initializeEnvironment()

;(async () => {
  await bootstrap()
})()
