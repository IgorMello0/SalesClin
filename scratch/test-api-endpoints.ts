async function test() {
  const email = 'admin@admin.com'
  const password = 'admin123'
  
  console.log('Logging in as:', email)
  const loginRes = await fetch('http://localhost:4000/api/profissionais/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const loginData = await loginRes.json()
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`)
  }
  
  const token = loginData.data.token
  console.log('Token obtained successfully!')

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Company-Id': '1', // MATRIZ
    'Content-Type': 'application/json'
  }

  console.log('\nFetching funnel configuration...')
  const funnelRes = await fetch('http://localhost:4000/api/funnel-config', { headers })
  const funnelData = await funnelRes.json()
  console.log('Funnel configuration data:', JSON.stringify(funnelData.data, null, 2))

  console.log('\nFetching modules...')
  const modulesRes = await fetch('http://localhost:4000/api/modules', { headers })
  const modulesData = await modulesRes.json()
  console.log('Modules response:', JSON.stringify(modulesData, null, 2))

  console.log('\nFetching leads...')
  const leadsRes = await fetch('http://localhost:4000/api/leads', { headers })
  const leadsData = await leadsRes.json()
  console.log('Leads data:', JSON.stringify(leadsData.data, null, 2))
}

test().catch(e => {
  console.error('API Test failed:', e.message)
})
