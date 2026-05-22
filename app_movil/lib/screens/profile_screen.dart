import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../contexts/auth_state.dart';
import '../models/monument.dart';
import '../models/user.dart';
import '../screens/login_screen.dart';
import '../services/auth_service.dart';
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
  final AuthService _authService = AuthService();
  static const int _recentActivityLimit = 3;

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
      activities: activities,
    );
  }

  Future<void> _logout() async {
    await _clearLocalSession();
    await _authService.signOut();
    if (!mounted) return;

    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  Future<void> _clearLocalSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    await prefs.remove('userId');
    authState.token = '';
  }

  Future<void> _openTermsAndConditions() async {
    // URL a los términos y condiciones (cambiar según tu sitio web)
    const termsUrl = 'https://historiar.example.com/terminos';
    try {
      if (await canLaunchUrl(Uri.parse(termsUrl))) {
        await launchUrl(Uri.parse(termsUrl), mode: LaunchMode.externalApplication);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir el enlace')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _showFullActivities(
    BuildContext context,
    List<_ProfileActivity> activities,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Actividad completa',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: activities.length,
                    separatorBuilder: (_, __) => const Divider(height: 0),
                    itemBuilder: (context, index) {
                      final activity = activities[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.grey.shade100,
                          child: Icon(activity.icon, color: AppColors.primary),
                        ),
                        title: Text(activity.title),
                        subtitle: Text(activity.dateLabel),
                        trailing: Text(
                          activity.metricLabel,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _editProfile(User currentUser) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');

    if (token == null || token.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No hay sesión activa')));
      return;
    }

    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController(text: currentUser.name);
    final emailController = TextEditingController(text: currentUser.email);
    final avatarController = TextEditingController(
      text: currentUser.profileImage ?? '',
    );
    final districtController = TextEditingController(
      text: currentUser.district ?? '',
    );

    final shouldRefresh = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        var isSaving = false;

        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
              ),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: SafeArea(
                  top: false,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Center(
                            child: Container(
                              width: 44,
                              height: 4,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Editar perfil',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Actualiza tus datos visibles en la cuenta.',
                            style: TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            controller: nameController,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Nombre',
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Ingresa tu nombre';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: emailController,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Correo',
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Ingresa un correo válido';
                              }
                              if (!value.contains('@')) {
                                return 'Ingresa un correo válido';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: avatarController,
                            keyboardType: TextInputType.url,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'URL de foto de perfil',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: districtController,
                            textInputAction: TextInputAction.done,
                            decoration: const InputDecoration(
                              labelText: 'Distrito',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: isSaving
                                  ? null
                                  : () async {
                                      if (!formKey.currentState!.validate()) {
                                        return;
                                      }

                                      setSheetState(() {
                                        isSaving = true;
                                      });

                                      try {
                                        await _userService.updateProfile(
                                          token: token,
                                          name: nameController.text.trim(),
                                          email: emailController.text.trim(),
                                          profileImage:
                                              avatarController.text
                                                  .trim()
                                                  .isEmpty
                                              ? null
                                              : avatarController.text.trim(),
                                          district:
                                              districtController.text
                                                  .trim()
                                                  .isEmpty
                                              ? null
                                              : districtController.text.trim(),
                                        );

                                        if (!mounted) return;
                                        Navigator.of(sheetContext).pop(true);
                                      } catch (error) {
                                        setSheetState(() {
                                          isSaving = false;
                                        });
                                        if (!mounted) return;
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              'No se pudo actualizar: $error',
                                            ),
                                          ),
                                        );
                                      }
                                    },
                              child: isSaving
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text('Guardar cambios'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (shouldRefresh == true && mounted) {
      await _loadUserProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Perfil actualizado')));
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Eliminar cuenta'),
          content: const Text(
            'Se borrarán tu cuenta, preferencias, visitas y resultados de quiz. Esta acción no se puede deshacer.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Eliminar'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');

    if (token == null || token.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No hay sesión activa')));
      return;
    }

    try {
      await _userService.deleteMyAccount(token);
      await _clearLocalSession();
      await _authService.signOut();

      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo eliminar la cuenta: $error')),
      );
    }
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
              style: TextStyle(color: AppColors.muted),
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
              elevation: 2,
              color: AppColors.surface,
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
                          backgroundImage:
                              userProfile.profileImage != null &&
                                  userProfile.profileImage!.isNotEmpty
                              ? NetworkImage(userProfile.profileImage!)
                              : null,
                          child:
                              userProfile.profileImage == null ||
                                  userProfile.profileImage!.isEmpty
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
                                  if (userProfile.joinDate != null)
                                    _InfoChip(label: userProfile.joinDate!),
                                  if (userProfile.district != null &&
                                      userProfile.district!.isNotEmpty)
                                    _InfoChip(label: userProfile.district!),
                                ],
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _editProfile(userProfile),
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: const Text('Editar'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
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
              ],
            ),
            const SizedBox(height: 20),
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
                        color: AppColors.primaryVariant,
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
            const SizedBox(height: 20),
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
                color: AppColors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    // Mostrar solo las primeras actividades y permitir ver más
                    ...data.activities.take(_recentActivityLimit).map((
                      activity,
                    ) {
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
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
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
                                color: AppColors.highlight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                activity.metricLabel,
                                style: TextStyle(
                                  color: AppColors.primaryVariant,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          if (activity !=
                              data.activities.take(_recentActivityLimit).last)
                            const Divider(height: 0),
                        ],
                      );
                    }),
                    if (data.activities.length > _recentActivityLimit)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: TextButton(
                          onPressed: () =>
                              _showFullActivities(context, data.activities),
                          child: const Text('Ver más actividad'),
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 20),
            Card(
              elevation: 2,
              color: AppColors.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _OptionTile(
                    icon: Icons.logout,
                    title: 'Cerrar Sesión',
                    subtitle: 'Salir de tu cuenta',
                    onTap: _logout,
                    isDestructive: true,
                  ),
                  const Divider(height: 1),
                  _OptionTile(
                    icon: Icons.delete_forever,
                    title: 'Eliminar cuenta',
                    subtitle: 'Borrar tu perfil y datos asociados',
                    onTap: _deleteAccount,
                    isDestructive: true,
                  ),
                  const Divider(height: 1),
                  _OptionTile(
                    icon: Icons.description_outlined,
                    title: 'Términos y Condiciones',
                    subtitle: 'Ver términos de uso',
                    onTap: _openTermsAndConditions,
                    isDestructive: false,
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
        color: AppColors.surface,
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
