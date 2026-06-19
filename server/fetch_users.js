const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJpYXQiOjE3ODE3ODA0MDgsImV4cCI6MTc4MjM4NTIwOH0.reHAXW1Giq4I11YRLHRK2Wb9AemjzfAW_9fA0VODla8';
(async () => {
  const fetch = (await import('node-fetch')).default;
  try {
    const res = await fetch('http://localhost:5001/api/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
})();
