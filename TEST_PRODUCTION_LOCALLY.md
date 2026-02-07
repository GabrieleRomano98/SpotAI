# Test Production Build Locally

## Step 1: Build the Docker image locally

```powershell
cd C:\Users\gromano\workspace\spotAI

# Build the image
docker build -t spotai-test .
```

## Step 2: Run the container with production environment

```powershell
# Run with NODE_ENV=production
docker run -p 8080:8080 -e NODE_ENV=production spotai-test
```

## Step 3: Test in browser

Open: http://localhost:8080

**Expected:** You should see the SpotAI interface (not 404)

---

## Debugging Steps

### Check if files exist in container:

```powershell
# Run container and open shell
docker run -it spotai-test /bin/sh

# Inside container, check files:
ls -la /app/
ls -la /app/public/

# Should see:
# /app/public/index.html
# /app/public/assets/
# /app/index.js
```

### Check environment variables:

```powershell
# Inside container:
echo $NODE_ENV
echo $PORT

# Should see:
# production
# 8080
```

### Check server logs:

```powershell
docker run -p 8080:8080 -e NODE_ENV=production spotai-test

# Should see:
# Server running on port 8080
# Environment: production
```

---

## Common Issues

### Issue 1: public/ folder is empty
**Symptom:** 404 on all requests
**Cause:** Vite build failed or didn't output to dist/
**Fix:** Check client/package.json build script

### Issue 2: NODE_ENV not set
**Symptom:** 404, but server runs
**Cause:** isProduction = false, so routes not registered
**Fix:** Add -e NODE_ENV=production when running

### Issue 3: Wrong path
**Symptom:** 404 on static files
**Cause:** public/ folder in wrong location
**Fix:** Verify COPY command in Dockerfile

---

Run these tests and report back what you see!
