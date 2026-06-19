(async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@callcrm.com', password: 'Admin@123' })
  });
  const data = await res.json();
  console.log('Response:', data);
})();
