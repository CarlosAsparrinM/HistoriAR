import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';

config();

const DATABASE_NAME = 'historiar';

function validatePassword(password) {
  if (password.length < 9 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 9 y 128 caracteres.');
  }
  if (!/^[A-Za-z0-9]+$/.test(password)) {
    throw new Error('La contraseña debe contener únicamente letras y números.');
  }
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Este comando requiere una terminal interactiva para ocultar la contraseña.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = Boolean(process.stdin.isRaw);

    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
    };

    const finish = () => {
      cleanup();
      process.stdout.write('\n');
      resolve(value);
    };

    const cancel = () => {
      cleanup();
      process.stdout.write('\n');
      reject(new Error('Operación cancelada.'));
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return cancel();
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(prompt);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

function describeTarget(connectionString) {
  const uri = new URL(connectionString);
  return `${uri.host}/${DATABASE_NAME}`;
}

export function isCreateConfirmationAccepted(value) {
  return String(value || '').trim().toLocaleUpperCase('es-PE') === 'CREAR';
}

async function askVisibleQuestions() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const confirmation = (await terminal.question('Escribe CREAR para continuar: ')).trim();
    if (!isCreateConfirmationAccepted(confirmation)) {
      throw new Error('Operación cancelada.');
    }

    const name = (await terminal.question('Nombre del administrador: ')).trim();
    const email = (await terminal.question('Correo del administrador: ')).trim().toLowerCase();
    return { name, email };
  } finally {
    terminal.close();
  }
}

export async function provisionAdmin({ name, email, password }) {
  if (!name) throw new Error('El nombre es obligatorio.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El correo no es válido.');
  validatePassword(password);

  const hashedPassword = await bcrypt.hash(password, 12);
  const existingUser = await User.findOne({ email }).select('+password');

  if (existingUser) {
    existingUser.name = name;
    existingUser.password = hashedPassword;
    existingUser.role = 'admin';
    existingUser.status = 'Activo';
    await existingUser.save();
    return 'promoted';
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    status: 'Activo',
  });
  return 'created';
}

export async function runAdminProvisioningCli() {
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) throw new Error('MONGODB_URI no está configurado.');

  console.log(`Destino: ${describeTarget(connectionString)}`);
  console.log('El comando creará un administrador o ascenderá el usuario existente con ese correo.');

  const identity = await askVisibleQuestions();
  const password = await readHidden('Contraseña: ');
  const confirmation = await readHidden('Repite la contraseña: ');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');

  try {
    await connectDB(connectionString);
    const result = await provisionAdmin({ ...identity, password });
    console.log(result === 'created'
      ? 'Administrador creado correctamente.'
      : 'Usuario existente ascendido a administrador correctamente.');
  } finally {
    await disconnectDB();
  }
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  runAdminProvisioningCli().catch((error) => {
    console.error(`No se pudo provisionar el administrador: ${error.message}`);
    process.exitCode = 1;
  });
}
