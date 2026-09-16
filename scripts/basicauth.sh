#!/bin/sh

# Set basic authentication if environment variables USERNAME and PASSWORD are set.
if [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
  echo "Setting up basic auth for: $USERNAME"
  htpasswd -bc /etc/nginx/.htpasswd "$USERNAME" "$PASSWORD"
  # Make this script idempotent across container restarts.
  # Without this, repeated runs will insert duplicate directives and Nginx will fail to start.
  sed -i '/auth_basic/d' /etc/nginx/conf.d/default.conf
  sed -i '/location = \/index.html {/a \        auth_basic "Restricted Content";\n        auth_basic_user_file \/etc\/nginx\/.htpasswd;' /etc/nginx/conf.d/default.conf
else
  rm -f /etc/nginx/.htpasswd
  sed -i '/auth_basic/d' /etc/nginx/conf.d/default.conf
fi
