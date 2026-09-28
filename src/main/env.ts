import { app } from 'electron'

global.ENV_PROD = app.isPackaged
global.IS_DEV = !global.ENV_PROD
