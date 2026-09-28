// import * as electron from 'electron'
import bootstrap from './bootstrap'
import './environment-init'

;(async () => {
  await bootstrap()
})()
