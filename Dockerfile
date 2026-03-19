# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cached separately from source)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS runner

# Replace the default global nginx config with one that:
#   - Has no 'user' directive (not valid when process isn't started as root)
#   - Sets pid and all temp paths inside /tmp (always writable by nginx user)
COPY nginx.conf /etc/nginx/nginx.conf

# Server block (vhost)
COPY nginx-vhost.conf /etc/nginx/conf.d/default.conf

# Copy built assets and set ownership for the nginx user
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
 && chown -R nginx:nginx /var/cache/nginx \
 && chown -R nginx:nginx /var/log/nginx

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
