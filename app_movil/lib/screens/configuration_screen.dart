import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../services/app_settings_service.dart';
import '../services/local_notification_service.dart';
import '../services/session_storage_service.dart';
import '../styles/app_colors.dart';
import '../widgets/app_feedback.dart';
import '../widgets/app_states.dart';
import 'login_screen.dart';

class ConfigurationScreen extends StatefulWidget {
  final AppSettingsService? settingsService;
  final SessionStorageService? sessionStorage;
  final Future<bool> Function()? requestNotificationPermissions;
  final Future<void> Function()? googleSignOut;
  final VoidCallback? onSettingsChanged;

  const ConfigurationScreen({
    super.key,
    this.settingsService,
    this.sessionStorage,
    this.requestNotificationPermissions,
    this.googleSignOut,
    this.onSettingsChanged,
  });

  @override
  State<ConfigurationScreen> createState() => _ConfigurationScreenState();
}

class _ConfigurationScreenState extends State<ConfigurationScreen> {
  late final AppSettingsService _settingsService;
  late final SessionStorageService _sessionStorage;

  bool _isLoading = true;
  bool _requestingNotificationPermission = false;
  String? _loadError;

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
    _settingsService = widget.settingsService ?? AppSettingsService();
    _sessionStorage = widget.sessionStorage ?? SessionStorageService();
    _loadConfiguration();
  }

  Future<void> _loadConfiguration() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _loadError = null;
      });
    }

    try {
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
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _loadError = 'No se pudieron cargar las preferencias: $error';
      });
    }
  }

  Future<void> _saveQuizPostVisitMode(QuizPostVisitMode mode) async {
    await _persistSetting<QuizPostVisitMode>(
      previous: _quizPostVisitMode,
      next: mode,
      apply: (value) => _quizPostVisitMode = value,
      persist: _settingsService.saveQuizPostVisitMode,
    );
  }

  Future<void> _saveLocationAccuracyMode(LocationAccuracyMode mode) async {
    await _persistSetting<LocationAccuracyMode>(
      previous: _locationAccuracyMode,
      next: mode,
      apply: (value) => _locationAccuracyMode = value,
      persist: _settingsService.saveLocationAccuracyMode,
    );
  }

  Future<void> _saveLocationRefreshPreset(LocationRefreshPreset preset) async {
    await _persistSetting<LocationRefreshPreset>(
      previous: _locationRefreshPreset,
      next: preset,
      apply: (value) => _locationRefreshPreset = value,
      persist: _settingsService.saveLocationRefreshPreset,
    );
  }

  Future<void> _saveQuizFeedbackPreset(QuizFeedbackPreset preset) async {
    await _persistSetting<QuizFeedbackPreset>(
      previous: _quizFeedbackPreset,
      next: preset,
      apply: (value) => _quizFeedbackPreset = value,
      persist: _settingsService.saveQuizFeedbackPreset,
    );
  }

  Future<void> _toggleNearbyNotifications(bool enabled) async {
    if (_requestingNotificationPermission ||
        enabled == _nearbyNotificationsEnabled) {
      return;
    }

    if (!enabled) {
      await _persistSetting<bool>(
        previous: _nearbyNotificationsEnabled,
        next: false,
        apply: (value) => _nearbyNotificationsEnabled = value,
        persist: _settingsService.saveNearbyNotificationsEnabled,
      );
      return;
    }

    setState(() {
      _requestingNotificationPermission = true;
    });

    try {
      final granted = await (widget.requestNotificationPermissions?.call() ??
          LocalNotificationService.instance.requestPermissions());

      if (!mounted) return;
      if (!granted) {
        AppFeedback.warning(
          context,
          'El sistema no concedió permiso para mostrar notificaciones.',
        );
        return;
      }

      await _settingsService.saveNearbyNotificationsEnabled(true);
      if (!mounted) return;
      setState(() {
        _nearbyNotificationsEnabled = true;
      });
      widget.onSettingsChanged?.call();
    } catch (error) {
      if (!mounted) return;
      AppFeedback.error(
        context,
        'No se pudo activar las notificaciones: $error',
      );
    } finally {
      if (mounted) {
        setState(() {
          _requestingNotificationPermission = false;
        });
      }
    }
  }

  Future<void> _saveNearbyNotificationDistance(
    NearbyNotificationDistancePreset preset,
  ) async {
    await _persistSetting<NearbyNotificationDistancePreset>(
      previous: _nearbyNotificationDistancePreset,
      next: preset,
      apply: (value) => _nearbyNotificationDistancePreset = value,
      persist: _settingsService.saveNearbyNotificationDistancePreset,
    );
  }

  Future<void> _persistSetting<T>({
    required T previous,
    required T next,
    required void Function(T value) apply,
    required Future<void> Function(T value) persist,
  }) async {
    if (previous == next) return;

    setState(() => apply(next));
    try {
      await persist(next);
      widget.onSettingsChanged?.call();
    } catch (error) {
      if (!mounted) return;
      setState(() => apply(previous));
      AppFeedback.error(
        context,
        'No se pudo guardar la preferencia: $error',
      );
    }
  }

  Future<void> _resetSettings() async {
    if (!mounted) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Restablecer ajustes'),
        content: const Text(
          '¿Estás seguro de que deseas restablecer todas las preferencias a sus valores predeterminados? Tu sesión no se cerrará.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Restablecer'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _settingsService.clearPreferences();
      await _loadConfiguration();
      if (!mounted) return;
      widget.onSettingsChanged?.call();
      AppFeedback.success(context, 'Preferencias restablecidas');
    } catch (error) {
      if (!mounted) return;
      AppFeedback.error(
        context,
        'No se pudieron restablecer los ajustes: $error',
      );
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.logout, color: AppColors.danger),
        title: const Text('Cerrar sesión'),
        content: const Text('¿Deseas salir de tu cuenta en este dispositivo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await (widget.googleSignOut?.call() ?? GoogleSignIn().signOut());
    } catch (_) {}

    await _sessionStorage.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Future<T?> _showChoiceSheet<T>({
    required String title,
    required List<_ChoiceItem<T>> items,
    required T selectedValue,
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
                    trailing: item.value == selectedValue
                        ? const Icon(
                            Icons.check_circle,
                            color: AppColors.primary,
                          )
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
      'version': '1.0.0',
      'build': '1',
      'lastUpdate': '21 junio 2026',
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
          ? const AppLoadingState(message: 'Cargando configuración...')
          : _loadError != null
          ? AppErrorState(
              title: 'No pudimos cargar los ajustes',
              message: _loadError!,
              onRetry: _loadConfiguration,
            )
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
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
                              subtitle: 'Define qué pasa al salir de RA',
                              valueLabel: _quizPostVisitMode.label,
                              onTap: () async {
                                final selected =
                                    await _showChoiceSheet<QuizPostVisitMode>(
                                      title: 'Modo de quiz post visita',
                                      selectedValue: _quizPostVisitMode,
                                      items: QuizPostVisitMode.values
                                          .map(
                                            (
                                              mode,
                                            ) => _ChoiceItem<QuizPostVisitMode>(
                                              value: mode,
                                              title: mode.label,
                                              subtitle: switch (mode) {
                                                QuizPostVisitMode.alwaysAsk =>
                                                  'Muestra el aviso al terminar la experiencia de RA',
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
                                final selected = await _showChoiceSheet<LocationAccuracyMode>(
                                  title: 'Precisión de ubicación',
                                  selectedValue: _locationAccuracyMode,
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
                              subtitle:
                                  'Controla cada cuánto se refresca la zona',
                              valueLabel: _locationRefreshPreset.label,
                              onTap: () async {
                                final selected =
                                    await _showChoiceSheet<
                                      LocationRefreshPreset
                                    >(
                                      title: 'Frecuencia de actualización',
                                      selectedValue: _locationRefreshPreset,
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
                              title: 'Pausa antes de continuar',
                              subtitle:
                                  'Da tiempo para leer la explicación del quiz',
                              valueLabel: _quizFeedbackPreset.label,
                              onTap: () async {
                                final selected =
                                    await _showChoiceSheet<QuizFeedbackPreset>(
                                      title: 'Pausa antes de continuar',
                                      selectedValue: _quizFeedbackPreset,
                                      items: QuizFeedbackPreset.values
                                          .map(
                                            (
                                              preset,
                                            ) => _ChoiceItem<QuizFeedbackPreset>(
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
                              valueLabel:
                                  _nearbyNotificationDistancePreset.label,
                              onTap: () async {
                                final selected =
                                    await _showChoiceSheet<
                                      NearbyNotificationDistancePreset
                                    >(
                                      title: 'Radio de notificación',
                                      selectedValue:
                                          _nearbyNotificationDistancePreset,
                                      items: NearbyNotificationDistancePreset
                                          .values
                                          .map((preset) {
                                            return _ChoiceItem<
                                              NearbyNotificationDistancePreset
                                            >(
                                              value: preset,
                                              title: preset.label,
                                              subtitle:
                                                  '${preset.meters} metros',
                                            );
                                          })
                                          .toList(),
                                    );
                                if (selected != null) {
                                  await _saveNearbyNotificationDistance(
                                    selected,
                                  );
                                }
                              },
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
                                _InfoRow(
                                  label: 'Build',
                                  value: appInfo['build']!,
                                ),
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
                          child: Column(
                            children: [
                              _OptionTile(
                                icon: Icons.restore,
                                title: 'Restablecer ajustes',
                                subtitle:
                                    'Restaura las preferencias a valores por defecto',
                                onTap: _resetSettings,
                              ),
                              const Divider(height: 0),
                              _OptionTile(
                                icon: Icons.logout,
                                title: 'Cerrar Sesión',
                                subtitle: 'Salir de tu cuenta',
                                onTap: _logout,
                                isDestructive: true,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _ChoiceItem<T> {
  final T value;
  final String title;
  final String? subtitle;

  const _ChoiceItem({required this.value, required this.title, this.subtitle});
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
      subtitle: Text.rich(
        TextSpan(
          text: '$subtitle\n',
          children: [
            TextSpan(
              text: valueLabel,
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      trailing: const Icon(Icons.chevron_right),
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
      onTap: () => onChanged(!value),
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
