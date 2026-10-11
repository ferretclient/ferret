# Ferret CLI — Alpine

Alpine Linux variant of the Ferret CLI Docker image.

**Base image:** `node:24-alpine`

## Building

```bash
docker build -t ferret:alpine ./images/alpine

# with specific Ferret CLI version
docker build \
  --build-arg FERRET_VERSION=0.2.0 \
  -t ferret:0.2.0-alpine \
  ./images/alpine
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/ferret ferret:alpine run

# with pinned version
docker run -v $(pwd):/ferret ferret:0.2.0-alpine run
```
