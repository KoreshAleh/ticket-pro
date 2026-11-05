# Используем легкий образ Node.js
FROM node:18-alpine

# Создаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь остальной код (включая tsconfig.json и src)
COPY . .
CMD ["npm", "run", "dev"]