FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm i next react react-dom
EXPOSE 3000
CMD ["npx","next","dev","-p","3000","-H","0.0.0.0"]
