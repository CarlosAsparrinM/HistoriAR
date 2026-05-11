import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_preferences.dart';
import '../services/preferences_service.dart';
import '../styles/app_colors.dart';
import 'login_screen.dart';

class ConfigurationScreen extends StatefulWidget {
  const ConfigurationScreen({super.key});

  @override
  State<ConfigurationScreen> createState() => _ConfigurationScreenState();
}

class _ConfigurationScreenState extends State<ConfigurationScreen> {
  Future<UserPreferences>? _preferencesFuture;
  final PreferencesService _preferencesService = PreferencesService();
  String? _token;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');
    final userId = prefs.getString('userId');

    // Cargar preferencias locales guardadas o usar por defecto
    final localPrefs = UserPreferences(
      userId: userId ?? 'local',
      askForQuizzes: prefs.getBool('pref_askForQuizzes') ?? true,
      notifications: prefs.getBool('pref_notifications') ?? true,
      location: prefs.getBool('pref_location') ?? true,
      arEffects: prefs.getBool('pref_arEffects') ?? true,
      sound: prefs.getBool('pref_sound') ?? true,
      highQuality: prefs.getBool('pref_highQuality') ?? false,
      offlineMode: prefs.getBool('pref_offlineMode') ?? false,
      dataUsage: prefs.getBool('pref_dataUsage') ?? true,
      language: prefs.getString('pref_language') ?? 'es',
      theme: prefs.getString('pref_theme') ?? 'light',
    );

    setState(() {
      _token = token;
      _userId = userId;

      // Si hay sesión, intentar cargar del backend, sino usar locales
      if (token != null && userId != null) {
        _preferencesFuture = _preferencesService
            .getUserPreferences(userId: userId, token: token)
            .then((backendPrefs) async {
              await _persistPreferencesLocally(prefs, backendPrefs);
              return backendPrefs;
            })
            .catchError((e) {
              // Si falla el backend, usar preferencias locales
              return localPrefs;
            });
      } else {
        // Sin sesión, usar directamente preferencias locales
        _preferencesFuture = Future.value(localPrefs);
      }
    });
  }

  Future<void> _persistPreferencesLocally(
    SharedPreferences prefs,
    UserPreferences preferences,
  ) async {
    await prefs.setBool('pref_askForQuizzes', preferences.askForQuizzes);
    await prefs.setBool('pref_notifications', preferences.notifications);
    await prefs.setBool('pref_location', preferences.location);
    await prefs.setBool('pref_arEffects', preferences.arEffects);
    await prefs.setBool('pref_sound', preferences.sound);
    await prefs.setBool('pref_highQuality', preferences.highQuality);
    await prefs.setBool('pref_offlineMode', preferences.offlineMode);
    await prefs.setBool('pref_dataUsage', preferences.dataUsage);
    await prefs.setString('pref_language', preferences.language);
    await prefs.setString('pref_theme', preferences.theme);
  }

  Future<void> _updatePreference({
    bool? askForQuizzes,
    bool? notifications,
    bool? location,
    bool? arEffects,
    bool? sound,
    bool? highQuality,
    bool? offlineMode,
    bool? dataUsage,
    String? language,
    String? theme,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    // Guardar localmente siempre
    if (askForQuizzes != null)
      await prefs.setBool('pref_askForQuizzes', askForQuizzes);
    if (notifications != null)
      await prefs.setBool('pref_notifications', notifications);
    if (location != null) await prefs.setBool('pref_location', location);
    if (arEffects != null) await prefs.setBool('pref_arEffects', arEffects);
    if (sound != null) await prefs.setBool('pref_sound', sound);
    if (highQuality != null)
      await prefs.setBool('pref_highQuality', highQuality);
    if (offlineMode != null)
      await prefs.setBool('pref_offlineMode', offlineMode);
    if (dataUsage != null) await prefs.setBool('pref_dataUsage', dataUsage);
    if (language != null) await prefs.setString('pref_language', language);
    if (theme != null) await prefs.setString('pref_theme', theme);

    // Intentar sincronizar con backend si hay sesión
    if (_token != null && _userId != null) {
      try {
        final updated = await _preferencesService.partialUpdatePreferences(
          userId: _userId!,
          token: _token!,
          askForQuizzes: askForQuizzes,
          notifications: notifications,
          location: location,
          arEffects: arEffects,
          sound: sound,
          highQuality: highQuality,
          offlineMode: offlineMode,
          dataUsage: dataUsage,
          language: language,
          theme: theme,
        );

        setState(() {
          _preferencesFuture = Future.value(updated);
        });
      } catch (e) {
        // Si falla backend, continuar con valores locales
        final currentPrefs = await _preferencesFuture;
        if (currentPrefs != null) {
          final updatedLocal = UserPreferences(
            userId: currentPrefs.userId,
            askForQuizzes: askForQuizzes ?? currentPrefs.askForQuizzes,
            notifications: notifications ?? currentPrefs.notifications,
            location: location ?? currentPrefs.location,
            arEffects: arEffects ?? currentPrefs.arEffects,
            sound: sound ?? currentPrefs.sound,
            highQuality: highQuality ?? currentPrefs.highQuality,
            offlineMode: offlineMode ?? currentPrefs.offlineMode,
            dataUsage: dataUsage ?? currentPrefs.dataUsage,
            language: language ?? currentPrefs.language,
            theme: theme ?? currentPrefs.theme,
          );
          setState(() {
            _preferencesFuture = Future.value(updatedLocal);
          });
        }
      }
    } else {
      // Sin sesión, actualizar solo localmente
      final currentPrefs = await _preferencesFuture;
      if (currentPrefs != null) {
        final updatedLocal = UserPreferences(
          userId: currentPrefs.userId,
          askForQuizzes: askForQuizzes ?? currentPrefs.askForQuizzes,
          notifications: notifications ?? currentPrefs.notifications,
          location: location ?? currentPrefs.location,
          arEffects: arEffects ?? currentPrefs.arEffects,
          sound: sound ?? currentPrefs.sound,
          highQuality: highQuality ?? currentPrefs.highQuality,
          offlineMode: offlineMode ?? currentPrefs.offlineMode,
          dataUsage: dataUsage ?? currentPrefs.dataUsage,
          language: language ?? currentPrefs.language,
          theme: theme ?? currentPrefs.theme,
        );
        setState(() {
          _preferencesFuture = Future.value(updatedLocal);
        });
      }
    }

    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Preferencias guardadas')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final appInfo = {
      "version": "0.8.1",
      "build": "Build 2026.05.10",
      "lastUpdate": "10 Mayo 2026",
    };

    return Scaffold(
      backgroundColor: AppColors.highlight,
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
          preferredSize: Size.fromHeight(24),
          child: Padding(
            padding: EdgeInsets.only(bottom: 8.0),
            child: Text(
              'Ajustes y preferencias de la app',
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ),
      ),
      body: (_preferencesFuture == null)
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : FutureBuilder<UserPreferences>(
              future: _preferencesFuture!,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 48,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text('Error: ${snapshot.error}'),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadPreferences,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  );
                }

                if (!snapshot.hasData) {
                  return const Center(
                    child: Text('No se pudieron cargar las preferencias'),
                  );
                }

                final preferences = snapshot.data!;

                return _buildConfigContent(context, preferences, appInfo);
              },
            ),
    );
  }

  Widget _buildConfigContent(
    BuildContext context,
    UserPreferences preferences,
    Map<String, String> appInfo,
  ) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: ListView(
          children: [
            _SectionTitle(
              icon: Icons.notifications_active_outlined,
              title: 'Notificaciones y Permisos',
            ),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.quiz_outlined,
                  title: 'Sugerir quizzes',
                  subtitle: 'Abrir el quiz después de visitar un monumento',
                  value: preferences.askForQuizzes,
                  onChanged: (v) => _updatePreference(askForQuizzes: v),
                ),
                const Divider(height: 0),
                _SwitchTile(
                  icon: Icons.notifications_outlined,
                  title: 'Notificaciones Push',
                  subtitle: 'Recibir alertas sobre nuevos monumentos y eventos',
                  value: preferences.notifications,
                  onChanged: (v) => _updatePreference(notifications: v),
                ),
                const Divider(height: 0),
                _SwitchTile(
                  icon: Icons.location_on_outlined,
                  title: 'Acceso a Ubicación',
                  subtitle:
                      'Permitir acceso para experiencias basadas en ubicación',
                  value: preferences.location,
                  onChanged: (v) => _updatePreference(location: v),
                ),
              ],
            ),

            const SizedBox(height: 16),

            _SectionTitle(
              icon: Icons.camera_alt_outlined,
              title: 'Realidad Aumentada',
            ),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.auto_awesome_outlined,
                  title: 'Efectos AR Avanzados',
                  subtitle: 'Habilitar partículas y efectos visuales en RA',
                  value: preferences.arEffects,
                  onChanged: (v) => _updatePreference(arEffects: v),
                ),
                const Divider(height: 0),
                _SwitchTile(
                  icon: Icons.phone_android_outlined,
                  title: 'Calidad Alta',
                  subtitle: 'Renderizado de alta calidad (consume más batería)',
                  value: preferences.highQuality,
                  onChanged: (v) => _updatePreference(highQuality: v),
                ),
              ],
            ),

            const SizedBox(height: 16),

            _SectionTitle(icon: Icons.volume_up_outlined, title: 'Audio'),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.volume_up_outlined,
                  title: 'Efectos de Sonido',
                  subtitle: 'Reproducir sonidos al interactuar con monumentos',
                  value: preferences.sound,
                  onChanged: (v) => _updatePreference(sound: v),
                ),
              ],
            ),

            const SizedBox(height: 16),

            _SectionTitle(
              icon: Icons.storage_outlined,
              title: 'Datos y Almacenamiento',
            ),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.wifi_off_outlined,
                  title: 'Modo Offline',
                  subtitle: 'Usar contenido descargado sin conexión',
                  value: preferences.offlineMode,
                  onChanged: (v) => _updatePreference(offlineMode: v),
                ),
                const Divider(height: 0),
                _SwitchTile(
                  icon: Icons.network_cell_outlined,
                  title: 'Optimizar Datos',
                  subtitle: 'Reducir el uso de datos móviles',
                  value: preferences.dataUsage,
                  onChanged: (v) => _updatePreference(dataUsage: v),
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
                    _InfoRow(label: 'Versión', value: appInfo["version"]!),
                    const Divider(),
                    _InfoRow(label: 'Build', value: appInfo["build"]!),
                    const Divider(),
                    _InfoRow(
                      label: 'Última actualización',
                      value: appInfo["lastUpdate"]!,
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
                    icon: Icons.privacy_tip_outlined,
                    title: 'Privacidad y Seguridad',
                    subtitle: 'Gestiona tus datos y privacidad',
                    onTap: () {},
                  ),
                  const Divider(height: 0),
                  _OptionTile(
                    icon: Icons.help_outline,
                    title: 'Ayuda y Soporte',
                    subtitle: 'FAQ, tutoriales y contacto',
                    onTap: () {},
                  ),
                  const Divider(height: 0),
                  _OptionTile(
                    icon: Icons.battery_saver_outlined,
                    title: 'Optimización de Batería',
                    subtitle: 'Consejos para ahorrar batería',
                    onTap: () {},
                  ),
                  const Divider(height: 0),
                  _OptionTile(
                    icon: Icons.logout,
                    title: 'Cerrar Sesión',
                    subtitle: 'Salir de tu cuenta',
                    onTap: () async {
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.remove('authToken');
                      await prefs.remove('userId');
                      if (mounted) {
                        // ignore: use_build_context_synchronously
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => LoginScreen()),
                        );
                      }
                    },
                    isDestructive: true,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Container(
              decoration: BoxDecoration(
                color: AppColors.highlight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.accent),
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.battery_saver_outlined,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Consejos de Rendimiento',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          '• Desactiva "Calidad Alta" para ahorrar batería\n'
                          '• Activa "Optimizar Datos" en conexiones móviles\n'
                          '• Usa el modo offline cuando sea posible\n'
                          '• Ajusta los efectos AR según tu dispositivo',
                          style: TextStyle(fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
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
          decoration: BoxDecoration(
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
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(children: children),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.grey.shade100,
        child: Icon(icon, color: Colors.grey.shade700),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text(subtitle, style: const TextStyle(color: Colors.grey)),
      trailing: Switch(
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
