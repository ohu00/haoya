# Docker Configuration

MAZANOKE supports configuration for deployments using Docker, allowing you to customize various settings through environment variables.

## Basic Authentication

To setup basic authentication, include both environmental variables `USERNAME` and `PASSWORD`:

```yaml
services:
  mazanoke:
    container_name: mazanoke
    image: ghcr.io/civilblur/mazanoke:latest
    ports:
      - "3474:80"
    environment:
      - USERNAME=YourUsername
      - PASSWORD=YourPassword
    restart: unless-stopped
```

When both are provided, the application will prompt users to sign in before granting access. If either is missing, basic authentication will not be applied.
