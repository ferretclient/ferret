# Ferret CLI — Alpine

Alpine Linux variant of the Ferret CLI Docker image.

**Base image:** `node:22-alpine`

## Building

```bash
docker build -t useferret/cli:alpine ./images/alpine

# with specific Ferret CLI version
docker build \
  --build-arg FERRET_VERSION=3.3.0 \
  -t useferret/cli:3.3.0-alpine \
  ./images/alpine
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/ferret useferret/cli:alpine run

# with pinned version
docker run -v $(pwd):/ferret useferret/cli:3.3.0-alpine run
```
