import jwt from 'jsonwebtoken';

// Sign a test token
const token = jwt.sign(
    { userId: '695ec76cb195a5f0be9abad2', email: 'mihai@test.com', role: 'user' },
    'streamclass_super_secret_key_2024',
    { expiresIn: '1h' }
);

console.log('Test token:', token);

// Now test the API
const courseId = '695ec6e09e6a096d5952d411'; // From the error

fetch(`http://localhost:8080/api/courses/${courseId}/enroll`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
})
    .then(async (res) => {
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    })
    .catch(err => console.error('Error:', err));
