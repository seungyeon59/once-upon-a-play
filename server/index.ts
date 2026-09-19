import app from './app.ts'

const port = Number(process.env.PORT ?? 8787)
app.listen(port, '0.0.0.0', () => {
  console.log(`[server] http://localhost:${port}`)
})
