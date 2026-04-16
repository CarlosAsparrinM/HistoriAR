import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/user_service.dart';
import '../models/user.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<User>? _userFuture;
  final UserService _userService = UserService();

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');
    
    if (token == null) {
      if (mounted) {
        // Mostrar aviso y redirigir al login en el siguiente frame
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No hay sesión activa')),
          );
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => LoginScreen()),
          );
        });
      }
      return;
    }

    setState(() {
      _userFuture = _userService.getMyProfile(token);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Mi Perfil',
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
              'Configuración y estadísticas',
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ),
      ),
      body: FutureBuilder<User>(
        future: _userFuture,
        builder: (context, snapshot) {
          if (_userFuture == null) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFFF6600)),
            );
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFFF6600)),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadUserProfile,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Center(
              child: Text('No se encontraron datos del usuario'),
            );
          }

          final userProfile = snapshot.data!;
          return _buildProfileContent(context, userProfile);
        },
      ),
    );
  }

  Widget _buildProfileContent(BuildContext context, User userProfile) {
    final List<Map<String, dynamic>> recentActivity = [
      {
        "type": "visit",
        "title": "Visitaste Palacio de Torre Tagle",
        "date": "Hace 2 días",
        "points": 150,
        "icon": Icons.place_outlined,
      },
      {
        "type": "achievement",
        "title": "Logro desbloqueado: Explorador de Lima",
        "date": "Hace 3 días",
        "points": 500,
        "icon": Icons.emoji_events_outlined,
      },
      {
        "type": "scan",
        "title": "Escaneaste 5 objetos AR",
        "date": "Hace 1 semana",
        "points": 100,
        "icon": Icons.camera_alt_outlined,
      },
    ];

    final initials = userProfile.name
        .split(' ')
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase())
        .join();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: ListView(
          children: [
            // Header de perfil
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: const Color(0xFFFF6600),
                          backgroundImage: userProfile.profileImage != null
                              ? NetworkImage(userProfile.profileImage!)
                              : null,
                          child: userProfile.profileImage == null
                              ? Text(
                                  initials,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                userProfile.name,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                userProfile.email,
                                style: const TextStyle(
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFF6600),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      'Nivel ${userProfile.level}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (userProfile.joinDate != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.grey.shade300,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.calendar_today_outlined,
                                            size: 14,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            userProfile.joinDate!,
                                            style: const TextStyle(
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () {
                            // TODO: editar perfil
                          },
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: const Text('Editar'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                userProfile.totalPoints.toString(),
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Puntos Totales',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                userProfile.achievements.toString(),
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Logros',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Stats
            Row(
              children: [
                _StatCard(
                  icon: Icons.place_outlined,
                  label: 'Monumentos Visitados',
                  value: userProfile.monumentsVisited.toString(),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  icon: Icons.camera_alt_outlined,
                  label: 'Escaneos AR',
                  value: userProfile.arScans.toString(),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  icon: Icons.access_time,
                  label: 'Tiempo Total',
                  value: userProfile.timeSpent ?? '0h',
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Insignias
            const Text(
              'Insignias Recientes',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (userProfile.badges.isNotEmpty)
              SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: userProfile.badges.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final badge = userProfile.badges[index];
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF6600),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.military_tech_outlined,
                            size: 16,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            badge,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              )
            else
              const Text(
                'Sin insignias por el momento',
                style: TextStyle(color: Colors.grey),
              ),

            const SizedBox(height: 24),

            // Actividad reciente
            const Text(
              'Actividad Reciente',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: recentActivity.map((activity) {
                  final icon = activity["icon"] as IconData;
                  final title = activity["title"] as String;
                  final date = activity["date"] as String;
                  final points = activity["points"] as int;

                  return Column(
                    children: [
                      ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.grey.shade100,
                          child: Icon(
                            icon,
                            color: const Color(0xFFFF6600),
                          ),
                        ),
                        title: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        subtitle: Text(
                          date,
                          style: const TextStyle(color: Colors.grey),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '+$points XP',
                            style: TextStyle(
                              color: Colors.green.shade700,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      if (activity != recentActivity.last)
                        const Divider(height: 0),
                    ],
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 24),

            // Opciones adicionales
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _OptionTile(
                    icon: Icons.security_outlined,
                    title: 'Privacidad y Seguridad',
                    subtitle: 'Gestiona tu privacidad',
                    onTap: () {},
                  ),
                  const Divider(height: 0),
                  _OptionTile(
                    icon: Icons.help_outline,
                    title: 'Ayuda y Soporte',
                    subtitle: 'Obtén ayuda con la app',
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
                      if (mounted) {
                        // ignore: use_build_context_synchronously
                        Navigator.of(context).pushReplacementNamed('/login');
                      }
                    },
                    isDestructive: true,
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

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          child: Column(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: Colors.grey.shade100,
                child: Icon(icon, color: const Color(0xFFFF6600), size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
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
        style: TextStyle(
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(color: subtitleColor),
      ),
    );
  }
}