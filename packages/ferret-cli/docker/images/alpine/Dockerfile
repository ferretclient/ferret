FROM node:22-alpine

LABEL maintainer="Ferret <support@ferret.io>"

ARG FERRET_VERSION
ENV FERRET_VERSION=${FERRET_VERSION}

LABEL org.opencontainers.image.source="https://github.com/jakahann/ferret-app"
LABEL org.opencontainers.image.description="Ferret CLI - Open source IDE for exploring and testing APIs"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Ferret CLI"
LABEL org.opencontainers.image.version="${FERRET_VERSION}"
LABEL org.opencontainers.image.url="https://ferret.io"
LABEL org.opencontainers.image.documentation="https://docs.ferret.io/fer-cli/overview"

ENV LC_ALL="en_US.UTF-8" \
    LANG="en_US.UTF-8" \
    LANGUAGE="en_US.UTF-8"

# If FERRET_VERSION is provided, validate it is a valid semver before installing
RUN if [ -n "$FERRET_VERSION" ]; then \
        if ! echo "$FERRET_VERSION" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then \
            echo "\033[0;31mA valid semver Ferret version is required in the FERRET_VERSION build-arg (e.g. 1.16.0)\033[0m"; \
            exit 1; \
        fi; \
    fi && \
    npm install -g @useferret/cli${FERRET_VERSION:+@${FERRET_VERSION}}

WORKDIR /ferret

USER node

ENTRYPOINT ["fer"]
CMD []
