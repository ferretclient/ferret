# Ferret CLI — Alpine

Alpine Linux variant of the Ferret CLI Docker image.

**Base image:** `node:22-alpine`

## Building

```bash
docker build -t ferret-app:alpine ./images/alpine

# with specific Ferret CLI version
docker build \
  --build-arg FERRET_VERSION=0.2.0 \
  -t ferret-app:0.2.0-alpine \
  ./images/alpine
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/ferret ferret-app:alpine run

# with pinned version
docker run -v $(pwd):/ferret ferret-app:0.2.0-alpine run
```
