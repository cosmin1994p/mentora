


async function testRegister() {
    const res = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'fitness_test' + Date.now(),
            email: 'fitness' + Date.now() + '@example.com',
            password: 'password123',
            interests: ['Fitness'],
            activityDomain: 'Healthcare'
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

testRegister();
