FROM node:20-slim

# Instalar apenas as dependências mínimas necessárias
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretório para sessões do WhatsApp
RUN mkdir -p .wwebjs_auth && chmod 755 .wwebjs_auth

# Criar usuário não-root
RUN groupadd -r nodeuser && useradd -r -g nodeuser -s /bin/bash nodeuser
RUN chown -R nodeuser:nodeuser /code
USER nodeuser

# Comando para iniciar
CMD ["node", "index.js"]