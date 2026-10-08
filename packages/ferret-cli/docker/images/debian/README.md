# Ferret CLI — Debian

Debian slim variant of the Ferret CLI Docker image.

**Base image:** `node:22-slim`

## Building

```bash
docker build -t useferret/cli:debian ./images/debian

# with specific Ferret CLI version
docker build \
  --build-arg FERRET_VERSION=3.3.0 \
  -t useferret/cli:3.3.0-debian \
  ./images/debian
```

## Usage

```bash
# Run a collection
docker run -v $(pwd):/ferret useferret/cli:debian run 

# with pinned version
docker run -v $(pwd):/ferret useferret/cli:3.3.0-debian run 
```
