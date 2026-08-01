import {
  createUser,
  getAllUsers,
  getUserById,
  softDeleteUser,
  updateUser,
} from '../services/userService.js';
import { buildPagination } from '../utils/pagination.js';

function toUserResponse(userDoc) {
  if (!userDoc) return userDoc;
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  user.profileImage = user.profileImage || user.avatarUrl || null;
  return user;
}

const ADMIN_USER_FIELDS = ['name', 'email', 'password', 'role', 'avatarUrl', 'district', 'status'];

function pickAdminUserFields(body = {}) {
  const payload = Object.fromEntries(
    ADMIN_USER_FIELDS
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]),
  );
  if (typeof body.profileImage === 'string' && payload.avatarUrl === undefined) {
    payload.avatarUrl = body.profileImage;
  }
  return payload;
}

/**
 * 📄 Listar usuarios con paginación y filtros (solo admin)
 */
export async function listUsers(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filter = { status: { $ne: 'Eliminado' } };

    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;

    const { items, total } = await getAllUsers(filter, { skip, limit });
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * 👤 Obtener un usuario por ID o “me” (usuario autenticado)
 */
export async function getUser(req, res) {
  try {
    let userId = req.params.id;

    // Si la ruta es /api/users/me, usamos el ID del token
    if (userId === 'me') {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'No autorizado: token inválido o ausente' });
      }
      userId = req.user.id;
    }

    const doc = await getUserById(userId);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(toUserResponse(doc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * 🙋‍♂️ Obtener el perfil del usuario autenticado directamente
 * (endpoint /api/users/me)
 */
export async function getMyProfile(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(toUserResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * ✏️ Actualizar perfil del usuario autenticado
 * (endpoint /api/users/me)
 */
export async function updateMyProfile(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const payload = {};
    if (typeof req.body?.name === 'string') payload.name = req.body.name;
    if (typeof req.body?.email === 'string') payload.email = req.body.email;
    if (typeof req.body?.district === 'string') payload.district = req.body.district;

    const avatar = req.body?.profileImage ?? req.body?.avatarUrl;
    if (typeof avatar === 'string') payload.avatarUrl = avatar;

    const doc = await updateUser(req.user.id, payload);
    if (!doc) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(toUserResponse(doc));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * 🗑️ Eliminar (soft delete) la cuenta del usuario autenticado
 * (endpoint /api/users/me)
 */
export async function deleteMyAccount(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const doc = await softDeleteUser(req.user.id);
    if (!doc) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Cuenta marcada como eliminada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * ➕ Crear nuevo usuario
 */
export async function createUserController(req, res) {
  try {
    const doc = await createUser(pickAdminUserFields(req.body));
    res.status(201).json({ id: doc._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * ✏️ Actualizar usuario por ID
 */
export async function updateUserController(req, res) {
  try {
    const doc = await updateUser(req.params.id, pickAdminUserFields(req.body));
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(toUserResponse(doc));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * 🗑️ Marcado como eliminado (soft delete)
 */
export async function deleteUserController(req, res) {
  try {
    const doc = await softDeleteUser(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json({ message: 'Marcado como eliminado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
