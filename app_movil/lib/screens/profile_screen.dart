import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../contexts/auth_state.dart';
import '../models/monument.dart';
import '../models/user.dart';
import '../screens/login_screen.dart';
import '../services/monuments_service.dart';
import '../services/user_service.dart';
import '../services/visits_service.dart';
import '../styles/app_colors.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<_ProfileData>? _profileFuture;
  final UserService _userService = UserService();
  final VisitsService _visitsService = VisitsService();
  final MonumentsService _monumentsService = MonumentsService();

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    setState(() {
      _profileFuture = _buildProfileData();
    });
  }

  Future<_ProfileData> _buildProfileData() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');

    if (token == null || token.isEmpty) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('No hay sesión activa')));
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LoginScreen()),
          );
        });
      }
      throw StateError('No hay sesión activa');
    }

    final user = await _userService.getMyProfile(token);
    final userId = prefs.getString('userId') ?? user.id;
    await prefs.setString('userId', userId);

    final results = await Future.wait([
      _visitsService.getVisitsByUser(userId: userId, token: token),
      _userService.getUserQuizAttempts(userId: userId, token: token),
      _monumentsService.fetchMonuments(),
    ]);

    final visits = results[0] as List<Map<String, dynamic>>;
    final attempts = results[1] as List<Map<String, dynamic>>;
    final monuments = results[2] as List<Monument>;
    final monumentsById = {
      for (final monument in monuments) monument.id: monument,
    };

    final activities = <_ProfileActivity>[
      ...visits.map(
        (visit) => _ProfileActivity.fromVisit(visit, monumentsById),
      ),
      ...attempts.map(
        (attempt) => _ProfileActivity.fromQuizAttempt(attempt, monumentsById),
      ),
    ]..sort((a, b) => b.date.compareTo(a.date));

    return _ProfileData(
      user: user,
      visits: visits,
      attempts: attempts,
      activities: activities.take(6).toList(),
    );
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    await prefs.remove('userId');
    authState.token = '';
    if (!mounted) return;

    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mi Perfil', style: TextStyle(color: Colors.black)),
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
      body: FutureBuilder<_ProfileData>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (_profileFuture == null ||
              snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
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
                      onPressed: _loadUserProfile,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final data = snapshot.data;
          if (data == null)
            return const Center(
              child: Text('No se encontraron datos del usuario'),
            );

          return _buildProfileContent(context, data);
        },
      ),
    );
  }

  Widget _buildProfileContent(BuildContext context, _ProfileData data) {
    final userProfile = data.user;
    final initials = userProfile.name
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => part[0].toUpperCase())
        .join();

    final visitCount = data.visits.length;
    final quizCount = data.attempts.length;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: ListView(
          children: [
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
                          backgroundColor: AppColors.primary,
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
                                style: const TextStyle(color: Colors.grey),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _InfoChip(
                                    label: 'Nivel ${userProfile.level}',
                                  ),
                                  if (userProfile.joinDate != null)
                                    _InfoChip(label: userProfile.joinDate!),
                                ],
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () {},
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
            Row(
              children: [
                _StatCard(
                  icon: Icons.place_outlined,
                  label: 'Monumentos Visitados',
                  value: visitCount.toString(),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  icon: Icons.quiz_outlined,
                  label: 'Quizzes',
                  value: quizCount.toString(),
                ),
                const SizedBox(width: 8),
                _StatCard(
                  icon: Icons.camera_alt_outlined,
                  label: 'Escaneos AR',
                  value: userProfile.arScans.toString(),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Insignias Recientes',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
                        color: AppColors.primary,
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
            const Text(
              'Actividad Reciente',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (data.activities.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'Todavía no hay visitas ni quizzes registrados.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              Card(
                elevation: 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: data.activities.map((activity) {
                    return Column(
                      children: [
                        ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.grey.shade100,
                            child: Icon(
                              activity.icon,
                              color: AppColors.primary,
                            ),
                          ),
                          title: Text(
                            activity.title,
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            activity.dateLabel,
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
                              activity.metricLabel,
                              style: TextStyle(
                                color: Colors.green.shade700,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        if (activity != data.activities.last)
                          const Divider(height: 0),
                      ],
                    );
                  }).toList(),
                ),
              ),
            const SizedBox(height: 24),
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
                    onTap: _logout,
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

class _ProfileData {
  final User user;
  final List<Map<String, dynamic>> visits;
  final List<Map<String, dynamic>> attempts;
  final List<_ProfileActivity> activities;

  const _ProfileData({
    required this.user,
    required this.visits,
    required this.attempts,
    required this.activities,
  });
}

class _ProfileActivity {
  final IconData icon;
  final String title;
  final String dateLabel;
  final String metricLabel;
  final DateTime date;

  const _ProfileActivity({
    required this.icon,
    required this.title,
    required this.dateLabel,
    required this.metricLabel,
    required this.date,
  });

  factory _ProfileActivity.fromVisit(
    Map<String, dynamic> visit,
    Map<String, Monument> monumentsById,
  ) {
    final monumentId = visit['monumentId'];
    final monumentName = monumentId is Map<String, dynamic>
        ? (monumentId['name'] as String? ?? 'Visita registrada')
        : monumentsById[monumentId?.toString()]?.name ?? 'Visita registrada';

    final date =
        _parseDate(visit['date']) ??
        _parseDate(visit['createdAt']) ??
        DateTime.now();
    final duration = visit['duration'];
    final rating = visit['rating'];

    final metricLabel = duration != null
        ? '${duration.toString()} min'
        : rating != null
        ? '★ ${rating.toString()}'
        : 'Visita';

    return _ProfileActivity(
      icon: Icons.place_outlined,
      title: 'Visitaste $monumentName',
      dateLabel: _relativeDate(date),
      metricLabel: metricLabel,
      date: date,
    );
  }

  factory _ProfileActivity.fromQuizAttempt(
    Map<String, dynamic> attempt,
    Map<String, Monument> monumentsById,
  ) {
    final monumentId = attempt['monumentId'];
    final monumentName = monumentId is Map<String, dynamic>
        ? (monumentId['name'] as String? ?? 'Quiz completado')
        : monumentsById[monumentId?.toString()]?.name ?? 'Quiz completado';

    final date =
        _parseDate(attempt['completedAt']) ??
        _parseDate(attempt['createdAt']) ??
        DateTime.now();
    final score = (attempt['percentageScore'] as num?)?.round() ?? 0;

    return _ProfileActivity(
      icon: Icons.quiz_outlined,
      title: 'Quiz completado en $monumentName',
      dateLabel: _relativeDate(date),
      metricLabel: '$score%',
      date: date,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  static String _relativeDate(DateTime date) {
    final difference = DateTime.now().difference(date);
    if (difference.inDays <= 0) return 'Hoy';
    if (difference.inDays == 1) return 'Hace 1 día';
    if (difference.inDays < 7) return 'Hace ${difference.inDays} días';
    if (difference.inDays < 30) return 'Hace ${difference.inDays ~/ 7} semanas';
    return 'Hace ${difference.inDays ~/ 30} meses';
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  const _InfoChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
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
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10, color: Colors.grey),
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
        style: TextStyle(fontWeight: FontWeight.w500, color: color),
      ),
      subtitle: Text(subtitle, style: TextStyle(color: subtitleColor)),
    );
  }
}
