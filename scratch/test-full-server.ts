import 'dotenv/config'

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION AT:', promise, 'REASON:', reason)
})

process.on('exit', (code) => {
  console.log('PROCESS EXITING WITH CODE:', code)
  console.trace('Exit trace:')
})

import '../server/index.js'

setInterval(() => {
  console.log('Keep-alive tick. Active handles:', (process as any)._getActiveHandles().length)
}, 2000)
