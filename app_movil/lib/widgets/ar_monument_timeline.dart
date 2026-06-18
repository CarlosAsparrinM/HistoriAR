import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../styles/app_colors.dart';

class ArMonumentTimeline extends StatelessWidget {
  final Monument monument;
  final bool showYears;

  const ArMonumentTimeline({
    super.key,
    required this.monument,
    this.showYears = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!monument.periodIsIdentified ||
        monument.periodStartYear == null ||
        monument.periodEndYear == null) {
      return const SizedBox.shrink();
    }

    final startYear = monument.periodStartYear!;
    final endYear = monument.periodEndYear!;
    final currentYear = DateTime.now().year;

    // Calcular la posición en el timeline
    final yearsSpan = (endYear - startYear).toDouble();
    final progressYears = (currentYear - startYear).toDouble();
    final progress = (progressYears / yearsSpan).clamp(0.0, 1.0);

    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showYears)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    startYear.toString(),
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    endYear.toString(),
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Stack(
              children: [
                Container(
                  height: 8,
                  width: double.infinity,
                  color: Colors.grey.withValues(alpha: 0.3),
                ),
                Container(
                  height: 8,
                  width: double.infinity * progress,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary,
                        AppColors.primary.withValues(alpha: 0.7),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (showYears)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                monument.periodName ?? "Período",
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 10,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
