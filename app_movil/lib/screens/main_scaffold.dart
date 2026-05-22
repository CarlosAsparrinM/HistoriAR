import 'package:flutter/material.dart';

import '../styles/app_colors.dart';
import '../widgets/app_motion.dart';
import 'configuration_screen.dart';
import 'explore_screen.dart';
import 'my_tour_screen.dart';
import 'profile_screen.dart';

class MainScaffold extends StatefulWidget {
  final String token; // <- token que viene del login

  const MainScaffold({super.key, required this.token});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _selectedIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      const ExploreScreen(), // 0
      const MyTourScreen(), // 1 usa el token real
      const ProfileScreen(), // 2 Perfil
      const ConfigurationScreen(), // 3 Configuración
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppFadeSwitcher(
        child: KeyedSubtree(
          key: ValueKey(_selectedIndex),
          child: _screens[_selectedIndex],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        elevation: 8,
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
        backgroundColor: Colors.white,
        landscapeLayout: BottomNavigationBarLandscapeLayout.spread,
        iconSize: 22,
        showUnselectedLabels: true,
        enableFeedback: true,
        mouseCursor: WidgetStateMouseCursor.clickable,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Explorar'),
          BottomNavigationBarItem(
            icon: Icon(Icons.emoji_events_outlined),
            label: 'Mi Tour',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Perfil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            label: 'Configuración',
          ),
        ],
      ),
    );
  }
}
