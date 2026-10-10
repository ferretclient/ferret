# Ferret CLI Docker Images

> **Not published yet.** The images below are the intended release layout. The Dockerfiles install the CLI from npm as `ferret-app`, so they can be built only after that package is published, and the image `ghcr.io/useferret/ferret` does not exist yet. The names here are the planned ones.

Docker images for the [Ferret CLI](https://github.com/useferret/ferret), enabling container-native API collection runs in CI/CD pipelines and local environments without requiring Node.js or npm on the host. See the [Ferret CLI docs](https://github.com/useferret/ferret/blob/main/docs/cli.md) for CLI usage.

## Registry

The planned image is on the GitHub Container Registry. Docker Hub is not planned.

```bash
docker pull ghcr.io/useferret/ferret:latest
```

---

## Variants

| Variant | Base image | Details |
|---------|-----------|---------|
| **Alpine** (default) | `node:22-alpine` | [→ Alpine README](https://github.com/useferret/ferret/blob/main/packages/ferret-cli/docker/images/alpine/README.md) |
| **Debian** | `node:22-slim` | [→ Debian README](https://github.com/useferret/ferret/blob/main/packages/ferret-cli/docker/images/debian/README.md) |

### Quick choice

- **Use Alpine** unless you have a specific reason not to (90% of users)
- **Use Debian** if you hit SSL/glibc compatibility issues

---

## Tags

Every release is planned to publish the following tags to `ghcr.io/useferret/ferret`.

### Alpine variant (default)

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest` | `ghcr.io/useferret/ferret:latest` | Newest release marked as latest. |
| `latest-alpine` | `ghcr.io/useferret/ferret:latest-alpine` | Alias of `latest` — also alpine. |
| `alpine` | `ghcr.io/useferret/ferret:alpine` | Newest alpine, moves on every alpine publish. |
| `<version>` | `ghcr.io/useferret/ferret:0.2.0` | Exact version, immutable. |
| `<version>-alpine` | `ghcr.io/useferret/ferret:0.2.0-alpine` | Exact version, explicitly alpine. |
| `<major.minor>` | `ghcr.io/useferret/ferret:0.2` | Floats with patch releases (0.2.x). |
| `<major.minor>-alpine` | `ghcr.io/useferret/ferret:0.2-alpine` | Same, explicitly alpine. |

### Debian variant

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest-debian` | `ghcr.io/useferret/ferret:latest-debian` | Newest debian release marked as latest. |
| `debian` | `ghcr.io/useferret/ferret:debian` | Newest debian, moves on every debian publish. |
| `<version>-debian` | `ghcr.io/useferret/ferret:0.2.0-debian` | Exact version, debian. |
| `<major.minor>-debian` | `ghcr.io/useferret/ferret:0.2-debian` | Floats with debian patch releases. |

The unsuffixed tags (`:latest`, `:0.2.0`, `:0.2`, `:alpine`) always resolve to the alpine variant by convention.

---

## Step-by-step guide

### Step 1 — Pull the image

```bash
# latest (alpine by default — smallest, fastest to pull)
docker pull ghcr.io/useferret/ferret:latest

# specific version (recommended for production CI)
docker pull ghcr.io/useferret/ferret:0.2.0

# major.minor — gets patch updates automatically
docker pull ghcr.io/useferret/ferret:0.2

# debian variant
docker pull ghcr.io/useferret/ferret:debian
docker pull ghcr.io/useferret/ferret:0.2.0-debian
```

---

#### Check it works

```bash
docker run --rm ghcr.io/useferret/ferret --version
```

---

### Step 2 — Run your collection

> These examples assume you are running `docker` from your Ferret collection directory. Mount that directory to `/ferret` and pass `fer` arguments directly after the image name. If your collection lives elsewhere on disk, see the path-based examples further down.

> **Cross-platform note:** the examples below use `$(pwd)` which works in Bash / Zsh / Git Bash / WSL. On Windows native shells, substitute `$(pwd)` with `${PWD}` (PowerShell) or `%cd%` (CMD).

> **Adding `fer` options:** The examples below show docker-specific flags. For all `fer run` options — recurse (`-r`), environments, variables, reporters, bail, and more — see the [Ferret CLI docs](https://github.com/useferret/ferret/blob/main/docs/cli.md).

```bash
# run every request in the Ferret collection (current dir)
docker run -v $(pwd):/ferret ghcr.io/useferret/ferret run 

# run a specific subfolder (group of requests) within that collection
docker run -v $(pwd):/ferret ghcr.io/useferret/ferret run ./api-tests

# run a single .fer request file from that collection
docker run -v $(pwd):/ferret ghcr.io/useferret/ferret run ./api-tests/login.fer

# write a JUnit XML report (lands in the current directory because of the bind mount)
docker run -v $(pwd):/ferret ghcr.io/useferret/ferret run --reporter-junit results.xml
```

For Windows CMD users, swap `$(pwd)` with `%cd%`:

```cmd
docker run -v %cd%:/ferret ghcr.io/useferret/ferret run 
```

#### Running a collection that lives at a different path

If your collection is not in your current directory, point `docker` at its path (relative or absolute) instead of `$(pwd)`:

```bash
# run every request in a collection at an arbitrary path
docker run -v /path/to/your/collection:/ferret ghcr.io/useferret/ferret run

# run a single .fer file from a collection at an arbitrary path
docker run -v /path/to/your/collection:/ferret ghcr.io/useferret/ferret run ./auth/login.fer
```

> **Note on `--rm`:** Examples below include `--rm`. Docker keeps stopped containers around after they exit, which lets you `docker logs` or `docker inspect` them later for debugging. If you'd rather have Docker auto-delete the container as soon as `fer` finishes — useful for CI runs or to avoid `docker ps -a` filling up with stale entries — append `--rm` to any `docker run` (or `docker compose run`) command:

```bash
docker run --rm -v $(pwd):/ferret ghcr.io/useferret/ferret run
```

> It's purely a cleanup convenience; it doesn't affect the image, mounts, stdout output, or exit code.


## CI/CD integration

### GitHub Actions

```yaml
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Ferret collection
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/ferret \
            ghcr.io/useferret/ferret:latest run --output results.xml --format junit

      - name: Publish Test Report
        uses: dorny/test-reporter@v3
        if: success() || failure()
        with:
          name: Ferret Test Results
          path: ${{github.workspace}}/results.xml
          reporter: java-junit
```

### GitLab CI

```yaml
api-tests:
  image: ghcr.io/useferret/ferret:latest
  script:
    - fer run --output results.xml --format junit
  artifacts:
    reports:
      junit: results.xml
```

---

## Docker Compose

### Quick example

A minimal `docker-compose.yml` for running a Ferret collection alongside your project:

```yaml
services:
  ferret-cli:
    image: ghcr.io/useferret/ferret:latest
    container_name: ferret-cli-runner
    volumes:
      - /path/to/collection:/ferret
      - /path/to/reports:/reports
    command:
      run .
      -r
      --env ci
      --reporter-json /reports/results.json
      --reporter-junit /reports/results.xml
      --reporter-html /reports/results.html
```

Then run:

```bash
docker compose run ferret-cli
```

The `/path/to/reports:/reports` mount catches the JSON, JUnit XML, and HTML reports on the host — drop any `--reporter-*` flag to skip that format.

### Try it from this repo

A ready-to-run `docker-compose.yml` lives in this repo at [`packages/ferret-tests/docker-compose.yml`](https://github.com/useferret/ferret/blob/main/packages/ferret-tests/docker-compose.yml). It mounts the sibling `collection/` directory into the container, runs the `echo` folder against the `Prod` environment, and writes JSON, JUnit XML, and HTML reports into `packages/ferret-tests/reports/`:

```bash
cd packages/ferret-tests
docker compose run ferret-cli
```

This fires a small set of requests against public endpoints that demonstrate the CLI executing requests and assertions inside a container.

---

## Image details

All variants include:

- **Entrypoint:** `fer`
- **Working directory:** `/ferret`
- **User:** `node` (UID 1000, non-root)
- **Architectures:** `linux/amd64`, `linux/arm64`

