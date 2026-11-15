import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { iniciarSockets } from './sockets/index.js';

const server = http.createServer(app);
iniciarSockets(server);

server.listen(env.PORT, () => {
  console.log(`SIGECAP API escuchando en http://localhost:${env.PORT}/api/v1`);
  console.log(`Documentación:           http://localhost:${env.PORT}/api/v1/docs`);
});

const cerrar = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
