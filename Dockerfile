# Use uma imagem base com Node.js
FROM node:18-alpine

# Instalar dependências necessárias para o Puppeteer/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    yarn \
    git

# Dizer ao Puppeteer para pular o download do Chromium, pois usaremos o do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production

# Copiar código da aplicação
COPY . .

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsappbot -u 1001 -G nodejs

# Criar diretório para dados do WhatsApp e dar permissões
RUN mkdir -p /app/.wwebjs_auth && \
    chown -R whatsappbot:nodejs /app

# Mudar para usuário não-root
USER whatsappbot

# Expor porta (opcional, para futuras APIs REST)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]