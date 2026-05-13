import Alert from '../models/Alert.js';

/**
 * Obtener todas las alertas con paginación
 * GET /api/alerts?limit=20&offset=0&read=false
 */
export const getAllAlerts = async (req, res) => {
  try {
    const { limit = 20, offset = 0, read, severity } = req.query;
    const skip = parseInt(offset) * parseInt(limit);

    const filter = {};
    if (read !== undefined) filter.read = read === 'true';
    if (severity) filter.severity = severity;

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .exec(),
      Alert.countDocuments(filter)
    ]);

    res.json({
      data: alerts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener alerta por ID
 * GET /api/alerts/:id
 */
export const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crear nueva alerta
 * POST /api/alerts
 */
export const createAlert = async (req, res) => {
  try {
    const { type, severity, title, message, data, action, actionUrl } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: type, title, message' });
    }

    const alert = new Alert({
      type,
      severity: severity || 'info',
      title,
      message,
      data,
      action,
      actionUrl
    });

    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Marcar alerta como leída
 * PATCH /api/alerts/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Marcar alerta como no leída
 * PATCH /api/alerts/:id/unread
 */
export const markAsUnread = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        read: false,
        readAt: null
      },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Descartar alerta
 * PATCH /api/alerts/:id/dismiss
 */
export const dismissAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        dismissed: true,
        dismissedAt: new Date()
      },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Marcar todas las alertas no leídas como leídas
 * PATCH /api/alerts/mark-all-read
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Alert.updateMany(
      { read: false },
      {
        read: true,
        readAt: new Date()
      }
    );

    const total = await Alert.countDocuments({ read: true });
    res.json({ message: 'All alerts marked as read', totalRead: total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener resumen de alertas
 * GET /api/alerts/summary
 */
export const getAlertsSummary = async (req, res) => {
  try {
    const [total, unread, critical, warnings] = await Promise.all([
      Alert.countDocuments({ dismissed: false }),
      Alert.countDocuments({ read: false, dismissed: false }),
      Alert.countDocuments({ severity: 'critical', dismissed: false }),
      Alert.countDocuments({ severity: 'warning', dismissed: false })
    ]);

    res.json({
      total,
      unread,
      critical,
      warnings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar alerta
 * DELETE /api/alerts/:id
 */
export const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
