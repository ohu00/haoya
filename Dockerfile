FROM node:alpine AS prepare

ARG ENVIRONMENT

RUN mkdir -p /usr/share/nginx/html/assets
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./assets /usr/share/nginx/html/assets
COPY ./favicon.ico /usr/share/nginx/html
COPY ./manifest.json /usr/share/nginx/html
COPY ./service-worker.js /usr/share/nginx/html
COPY ./scripts /scripts

RUN node /scripts/environment.common.js
RUN node /scripts/environment.prod.js

FROM nginx:alpine

# Setup basic authentication
RUN apk add --no-cache apache2-utils
COPY ./scripts/basicauth.sh /usr/local/bin/basicauth.sh
RUN chmod +x /usr/local/bin/basicauth.sh
COPY ./config/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=prepare /usr/share/nginx/html /usr/share/nginx/html

EXPOSE 80

CMD ["/bin/sh", "-c", "/usr/local/bin/basicauth.sh; nginx -g 'daemon off;'"]
