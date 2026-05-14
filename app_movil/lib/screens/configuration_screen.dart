import 'package:flutter/material.dart';

import '../services/app_settings_service.dart';
import '../services/local_notification_service.dart';
import '../styles/app_colors.dart';
import 'login_screen.dart';

class ConfigurationScreen extends StatefulWidget {
  const ConfigurationScreen({super.key});

  @override
  State<ConfigurationScreen> createState() => _ConfigurationScreenState();
}

class _ConfigurationScreenState extends State<ConfigurationScreen> {
  final AppSettingsService _settingsService = AppSettingsService();

  bool _isLoading = true;
  bool _requestingNotificationPermission = false;

  QuizPostVisitMode _quizPostVisitMode = QuizPostVisitMode.alwaysAsk;
  LocationAccuracyMode _locationAccuracyMode = LocationAccuracyMode.high;
  LocationRefreshPreset _locationRefreshPreset = LocationRefreshPreset.normal;
  QuizFeedbackPreset _quizFeedbackPreset = QuizFeedbackPreset.normal;
  bool _nearbyNotificationsEnabled = false;
  NearbyNotificationDistancePreset _nearbyNotificationDistancePreset =
      NearbyNotificationDistancePreset.near;

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
  }

  Future<void> _loadConfiguration() async {
    final appSettings = await _settingsService.load();

    if (!mounted) return;

    setState(() {
      _quizPostVisitMode = appSettings.quizPostVisitMode;
      _locationAccuracyMode = appSettings.locationAccuracyMode;
      _locationRefreshPreset = appSettings.locationRefreshPreset;
      _quizFeedbackPreset = appSettings.quizFeedbackPreset;
      _nearbyNotificationsEnabled = appSettings.nearbyNotificationsEnabled;
      _nearbyNotificationDistancePreset =
          appSettings.nearbyNotificationDistancePreset;
      _isLoading = false;
    });
  }

  Future<void> _saveQuizPostVisitMode(QuizPostVisitMode mode) async {
    setState(() {
      _quizPostVisitMode = mode;
    });
    await _settingsService.saveQuizPostVisitMode(mode);
  }

  Future<void> _saveLocationAccuracyMode(LocationAccuracyMode mode) async {
    setState(() {
      _locationAccuracyMode = mode;
    });
    await _settingsService.saveLocationAccuracyMode(mode);
  }

  Future<void> _saveLocationRefreshPreset(LocationRefreshPreset preset) async {
    setState(() {
      _locationRefreshPreset = preset;
    });
    await _settingsService.saveLocationRefreshPreset(preset);
  }

  Future<void> _saveQuizFeedbackPreset(QuizFeedbackPreset preset) async {
    setState(() {
      _quizFeedbackPreset = preset;
    });
    await _settingsService.saveQuizFeedbackPreset(preset);
  }

  Future<void> _toggleNearbyNotifications(bool enabled) async {
    setState(() {
      _nearbyNotificationsEnabled = enabled;
    });
    await _settingsService.saveNearbyNotificationsEnabled(enabled);

    if (!enabled) return;

    setState(() {
      _requestingNotificationPermission = true;
    });

    final granted = await LocalNotificationService.instance
        .requestPermissions();

    if (!mounted) return;

    setState(() {
      _requestingNotificationPermission = false;
    });

    if (!granted) {
      await _settingsService.saveNearbyNotificationsEnabled(false);
      setState(() {
        _nearbyNotificationsEnabled = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Permiso de notificaciones denegado')),
      );
    }
  }

  Future<void> _saveNearbyNotificationDistance(
    NearbyNotificationDistancePreset preset,
  ) async {
    setState(() {
      _nearbyNotificationDistancePreset = preset;
    });
    await _settingsService.saveNearbyNotificationDistancePreset(preset);
  }

  Future<void> _showCleanupSheet() async {
    if (!mounted) return;

    final action = await showModalBottomSheet<_CleanupAction>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Limpiar almacenamiento local',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Elige qué quieres borrar en este dispositivo.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              _BottomActionTile(
                icon: Icons.tune,
                title: 'Solo preferencias',
                subtitle: 'Borra ajustes locales y conserva la sesión',
                onTap: () =>
                    Navigator.of(sheetContext).pop(_CleanupAction.preferences),
              ),
              _BottomActionTile(
                icon: Icons.logout,
                title: 'Solo sesión',
                subtitle: 'Cierra sesión y conserva las preferencias',
                onTap: () =>
                    Navigator.of(sheetContext).pop(_CleanupAction.session),
              ),
              _BottomActionTile(
                icon: Icons.delete_forever,
                title: 'Todo local',
                subtitle: 'Borra sesión y preferencias locales',
                isDestructive: true,
                onTap: () => Navigator.of(sheetContext).pop(_CleanupAction.all),
              ),
            ],
          ),
        );
      },
    );

    if (action == null) return;

    if (action == _CleanupAction.preferences) {
      await _settingsService.clearPreferences();
      await _loadConfiguration();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Preferencias locales limpiadas')),
        );
      }
      return;
    }

    if (action == _CleanupAction.session) {
      await _settingsService.clearSession();
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }

    await _settingsService.clearAllLocalData();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  Future<T?> _showChoiceSheet<T>({
    required String title,
    required List<_ChoiceItem<T>> items,
  }) async {
    return showModalBottomSheet<T>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                ...items.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    onTap: () => Navigator.of(sheetContext).pop(item.value),
                    title: Text(item.title),
                    subtitle: item.subtitle == null
                        ? null
                        : Text(
                            item.subtitle!,
                            style: const TextStyle(fontSize: 12),
                          ),
                    trailing: item.value == items.first.value
                        ? const SizedBox.shrink()
                        : null,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appInfo = {
      'version': '0.8.1',
      'build': 'Build 2026.05.10',
      'lastUpdate': '10 Mayo 2026',
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Configuración',
          style: TextStyle(color: Colors.black),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        centerTitle: false,
        iconTheme: const IconThemeData(color: Colors.black),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(28),
          child: Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                SizedBox(width: 16),
                Text(
                  'Ajustes y preferencias de la app',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: ListView(
                  children: [
                    _SectionTitle(
                      icon: Icons.quiz_outlined,
                      title: 'Quiz y visita',
                    ),
                    _SettingsCard(
                      children: [
                        _SelectionTile(
                          icon: Icons.quiz_outlined,
                          title: 'Modo de quiz post visita',
                          subtitle: 'Define qué pasa al salir de AR',
                          valueLabel: _quizPostVisitMode.label,
                          onTap: () async {
                            final selected =
                                await _showChoiceSheet<QuizPostVisitMode>(
                                  title: 'Modo de quiz post visita',
                                  items: QuizPostVisitMode.values
                                      .map(
                                        (
                                          mode,
                                        ) => _ChoiceItem<QuizPostVisitMode>(
                                          value: mode,
                                          title: mode.label,
                                          subtitle: switch (mode) {
                                            QuizPostVisitMode.alwaysAsk =>
                                              'Muestra el aviso al terminar la experiencia AR',
                                            QuizPostVisitMode.autoOpen =>
                                              'Abre el quiz de inmediato',
                                            QuizPostVisitMode.neverShow =>
                                              'No muestra el quiz tras la visita',
                                          },
                                        ),
                                      )
                                      .toList(),
                                );
                            if (selected != null) {
                              await _saveQuizPostVisitMode(selected);
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _SectionTitle(
                      icon: Icons.location_on_outlined,
                      title: 'Ubicación y mapa',
                    ),
                    _SettingsCard(
                      children: [
                        _SelectionTile(
                          icon: Icons.gps_fixed,
                          title: 'Precisión de ubicación',
                          subtitle: 'Ajusta la precisión del seguimiento',
                          valueLabel: _locationAccuracyMode.label,
                          onTap: () async {
                            final selected =
                                await _showChoiceSheet<LocationAccuracyMode>(
                                  title: 'Precisión de ubicación',
                                  items: LocationAccuracyMode.values
                                      .map(
                                        (
                                          mode,
                                        ) => _ChoiceItem<LocationAccuracyMode>(
                                          value: mode,
                                          title: mode.label,
                                          subtitle: switch (mode) {
                                            LocationAccuracyMode.high =>
                                              'Mejor precisión y más uso de batería',
                                            LocationAccuracyMode.medium =>
                                              'Balance entre precisión y batería',
                                            LocationAccuracyMode.economy =>
                                              'Menor precisión y menor consumo',
                                          },
                                        ),
                                      )
                                      .toList(),
                                );
                            if (selected != null) {
                              await _saveLocationAccuracyMode(selected);
                            }
                          },
                        ),
                        const Divider(height: 0),
                        _SelectionTile(
                          icon: Icons.location_searching_outlined,
                          title: 'Frecuencia de contexto',
                          subtitle: 'Controla cada cuánto se refresca la zona',
                          valueLabel: _locationRefreshPreset.label,
                          onTap: () async {
                            final selected =
                                await _showChoiceSheet<LocationRefreshPreset>(
                                  title: 'Frecuencia de actualización',
                                  items: LocationRefreshPreset.values
                                      .map(
                                        (
                                          preset,
                                        ) => _ChoiceItem<LocationRefreshPreset>(
                                          value: preset,
                                          title: preset.label,
                                          subtitle:
                                              '${preset.seconds}s y ${preset.distanceMeters}m de umbral',
                                        ),
                                      )
                                      .toList(),
                                );
                            if (selected != null) {
                              await _saveLocationRefreshPreset(selected);
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _SectionTitle(
                      icon: Icons.rate_review_outlined,
                      title: 'Quiz',
                    ),
                    _SettingsCard(
                      children: [
                        _SelectionTile(
                          icon: Icons.timer_outlined,
                          title: 'Tiempo de feedback',
                          subtitle: 'Controla cuánto dura la explicación',
                          valueLabel: _quizFeedbackPreset.label,
                          onTap: () async {
                            final selected =
                                await _showChoiceSheet<QuizFeedbackPreset>(
                                  title: 'Tiempo de feedback',
                                  items: QuizFeedbackPreset.values
                                      .map(
                                        (preset) =>
                                            _ChoiceItem<QuizFeedbackPreset>(
                                              value: preset,
                                              title: preset.label,
                                              subtitle:
                                                  '${preset.seconds} segundos',
                                            ),
                                      )
                                      .toList(),
                                );
                            if (selected != null) {
                              await _saveQuizFeedbackPreset(selected);
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _SectionTitle(
                      icon: Icons.notifications_active_outlined,
                      title: 'Notificaciones cercanas',
                    ),
                    _SettingsCard(
                      children: [
                        _SwitchTile(
                          icon: Icons.notifications_active_outlined,
                          title: 'Notificar monumentos cercanos',
                          subtitle:
                              'Muestra alertas cuando haya monumentos o tours cerca',
                          value: _nearbyNotificationsEnabled,
                          onChanged: _toggleNearbyNotifications,
                          trailing: _requestingNotificationPermission
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : null,
                        ),
                        const Divider(height: 0),
                        _SelectionTile(
                          icon: Icons.place_outlined,
                          title: 'Radio de notificación',
                          subtitle: 'Define a qué distancia avisar',
                          valueLabel: _nearbyNotificationDistancePreset.label,
                          onTap: () async {
                            final selected =
                                await _showChoiceSheet<
                                  NearbyNotificationDistancePreset
                                >(
                                  title: 'Radio de notificación',
                                  items: NearbyNotificationDistancePreset.values
                                      .map((preset) {
                                        return _ChoiceItem<
                                          NearbyNotificationDistancePreset
                                        >(
                                          value: preset,
                                          title: preset.label,
                                          subtitle: '${preset.meters} metros',
                                        );
                                      })
                                      .toList(),
                                );
                            if (selected != null) {
                              await _saveNearbyNotificationDistance(selected);
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _SectionTitle(
                      icon: Icons.storage_outlined,
                      title: 'Datos y almacenamiento',
                    ),
                    _SettingsCard(
                      children: [
                        _OptionTile(
                          icon: Icons.delete_sweep_outlined,
                          title: 'Limpiar almacenamiento local',
                          subtitle: 'Borra preferencias, sesión o todo local',
                          onTap: _showCleanupSheet,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _SectionTitle(
                      icon: Icons.info_outline,
                      title: 'Información de la App',
                    ),
                    Card(
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            _InfoRow(
                              label: 'Versión',
                              value: appInfo['version']!,
                            ),
                            const Divider(),
                            _InfoRow(label: 'Build', value: appInfo['build']!),
                            const Divider(),
                            _InfoRow(
                              label: 'Última actualización',
                              value: appInfo['lastUpdate']!,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: _OptionTile(
                        icon: Icons.logout,
                        title: 'Cerrar Sesión',
                        subtitle: 'Salir de tu cuenta',
                        onTap: () async {
                          await _settingsService.clearSession();
                          if (!mounted) return;
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => const LoginScreen(),
                            ),
                          );
                        },
                        isDestructive: true,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

enum _CleanupAction { preferences, session, all }

class _ChoiceItem<T> {
  final T value;
  final String title;
  final String? subtitle;

  const _ChoiceItem({required this.value, required this.title, this.subtitle});
}

class _BottomActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDestructive;

  const _BottomActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? Colors.red : Colors.black;
    final subtitleColor = isDestructive ? Colors.red.shade300 : Colors.grey;

    return ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: subtitleColor),
      title: Text(
        title,
        style: TextStyle(fontWeight: FontWeight.w500, color: color),
      ),
      subtitle: Text(subtitle, style: TextStyle(color: subtitleColor)),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionTitle({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 18),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;

  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(children: children),
    );
  }
}

class _SelectionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String valueLabel;
  final VoidCallback onTap;

  const _SelectionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.valueLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: Colors.grey.shade100,
        child: Icon(icon, color: Colors.grey.shade700),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: const TextStyle(color: Colors.grey)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(valueLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Widget? trailing;

  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.grey.shade100,
        child: Icon(icon, color: Colors.grey.shade700),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: const TextStyle(color: Colors.grey)),
      trailing:
          trailing ??
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
          ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDestructive;

  const _OptionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? Colors.red : Colors.black;
    final subtitleColor = isDestructive ? Colors.red.shade300 : Colors.grey;

    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: subtitleColor),
      title: Text(
        title,
        style: TextStyle(fontWeight: FontWeight.w500, color: color),
      ),
      subtitle: Text(subtitle, style: TextStyle(color: subtitleColor)),
    );
  }
}
