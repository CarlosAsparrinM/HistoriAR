import 'package:flutter/material.dart';

import '../services/pending_visits_service.dart';
import 'configuration_screen.dart';
import 'explore_screen.dart';
import 'my_tour_screen.dart';
import 'profile_screen.dart';

class MainScaffold extends StatefulWidget {
  final String token;

  const MainScaffold({super.key, required this.token});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _selectedIndex = 0;
  int _settingsRevision = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    PendingVisitsService().sync();
    _screens = [
      ExploreScreen(settingsRevision: _settingsRevision),
      const MyTourScreen(),
      const ProfileScreen(),
      ConfigurationScreen(onSettingsChanged: _onSettingsChanged),
    ];
  }

  void _onSettingsChanged() {
    if (!mounted) return;
    setState(() {
      _settingsRevision++;
      _screens[0] = ExploreScreen(settingsRevision: _settingsRevision);
    });
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Explorar',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events),
            label: 'Mi Tour',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }
}
