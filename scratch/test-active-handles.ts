import 'dotenv/config'
import express from 'express'

const app = express()
const server = app.listen(4000, () => {
  console.log('Server listening')
  console.log('Active handles:', (process as any)._getActiveHandles().length)
  console.log('Active requests:', (process as any)._getActiveRequests().length)
})
