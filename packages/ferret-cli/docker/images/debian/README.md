# Ferret CLI — Debian

Debian slim variant of the Ferret CLI Docker image.

**Base image:** `node:22-slim`

## Building

```bash
docker build -t ferret:debian ./images/debian

# with specific Ferret CLI version
docker build \
  --build-arg FERRET_VERSION=0.2.0 \
  -t ferret:0.2.0-debian \
  ./images/debian
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/ferret ferret:debian run 

# with pinned version
docker run -v $(pwd):/ferret ferret:0.2.0-debian run 
```
