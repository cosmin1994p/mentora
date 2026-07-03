# 🔍 DEBUGGING - VERIFICARE TOKEN ADMIN

## STEP 1: Check Token in localStorage

1. **Open DevTools** - F12
2. **Go to Console tab**
3. **Paste this:**
```javascript
const token = localStorage.getItem('authToken');
console.log('Token length:', token?.length);
console.log('Token start:', token?.substring(0, 50));
console.log('Token expires:', new Date(JSON.parse(atob(token?.split('.')[1])).exp * 1000));
```

4. **Check output**: Should show token length > 100, starts with 'eyJ...', expiry date in future

## STEP 2: Try Upload & Check Logs

1. **In Console tab, look for:**
```
🔐 Course upload token check: {...}
```

2. **If hasToken is FALSE:**
   - You're not logged in as admin
   - Need to login again

3. **If hasToken is TRUE but upload fails:**
   - Token is sent
   - Check backend console for error

## STEP 3: Check Backend Logs

**In terminal where backend is running, look for:**
```
[AUTH] Token verification failed: ...
[AUTH] No token provided...
```

If you see:
- **"No token provided"** → XHR not sending Authorization header
- **"Token verification failed"** → JWT signature invalid (token corrupted?)
- **Other error** → Something else wrong

## STEP 4: Try Simple Re-login

1. **Logout** (if there's a logout button)
2. **Go to http://localhost:3000/admin**
3. **Login again** with:
   - Username: `admintudy`
   - Password: `admintudy`
4. **Try creating course again**

## STEP 5: If Still Fails

1. **Take screenshot** of error message
2. **Copy these from browser console:**
   - The "🔐 Course upload token check" message
   - Any errors with red highlighting
3. **Copy these from backend terminal:**
   - Any [AUTH] messages
   - Any error stack traces

Then provide to developer with screenshot!
