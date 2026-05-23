import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../styles/app_colors.dart';

Future<void> showMonumentInfoSheet(
  BuildContext context,
  Monument monument,
) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.black,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (sheetContext) {
      return DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.58,
        minChildSize: 0.42,
        maxChildSize: 0.92,
        builder: (sheetContext, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              monument.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if ((monument.culture ?? '').isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  monument.culture!,
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(sheetContext).pop(),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _InfoItem(
                    label: 'Periodo',
                    value: _buildPeriodText(monument),
                  ),
                  _InfoItem(
                    label: 'Descubrimiento',
                    value: _buildDiscoveryText(monument),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    monument.description,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  _PeriodTimelineCard(
                    periodLabel: monument.periodName,
                    periodIsIdentified: monument.periodIsIdentified,
                    startYear: monument.periodStartYear,
                    endYear: monument.periodEndYear,
                    discoveryYear: monument.discoveryDiscoveredAt?.year,
                    discoveryIsKnown: monument.discoveryIsDateKnown,
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

String _buildPeriodText(Monument monument) {
  if (!monument.periodIsIdentified) {
    return 'No identificado';
  }

  final periodName = (monument.periodName ?? '').trim();
  final start = monument.periodStartYear;
  final end = monument.periodEndYear;

  if (start == null && end == null) {
    return periodName.isNotEmpty ? periodName : 'Sin datos';
  }

  final rangeText = (start != null && end != null)
      ? '$start - $end'
      : '${start ?? end}';

  if (periodName.isEmpty) return rangeText;
  return '$periodName ($rangeText)';
}

String _buildDiscoveryText(Monument monument) {
  final dateText = monument.discoveryIsDateKnown
      ? _formatDate(monument.discoveryDiscoveredAt)
      : 'Fecha desconocida';

  final discovererText = monument.discoveryIsDiscovererKnown
      ? ((monument.discoveryDiscovererName ?? '').trim().isNotEmpty
            ? monument.discoveryDiscovererName!.trim()
            : 'Descubridor no especificado')
      : 'Descubridor desconocido';

  return '$dateText • $discovererText';
}

String _formatDate(DateTime? date) {
  if (date == null) return 'Fecha desconocida';
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year.toString();
  return '$day/$month/$year';
}

class _InfoItem extends StatelessWidget {
  final String label;
  final String value;

  const _InfoItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodTimelineCard extends StatelessWidget {
  final String? periodLabel;
  final bool periodIsIdentified;
  final int? startYear;
  final int? endYear;
  final int? discoveryYear;
  final bool discoveryIsKnown;

  const _PeriodTimelineCard({
    this.periodLabel,
    required this.periodIsIdentified,
    this.startYear,
    this.endYear,
    this.discoveryYear,
    required this.discoveryIsKnown,
  });

  @override
  Widget build(BuildContext context) {
    final hasRange = startYear != null && endYear != null;
    final label = (periodLabel ?? '').trim();
    final periodText = !periodIsIdentified
        ? 'Periodo no identificado'
        : (label.isNotEmpty ? label : 'Periodo historico');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  periodText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (hasRange)
            _TimelineBar(
              startYear: startYear!,
              endYear: endYear!,
              discoveryYear: discoveryIsKnown ? discoveryYear : null,
            )
          else
            Text(
              'Sin rango cronologico completo',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.78),
                fontSize: 11,
              ),
            ),
        ],
      ),
    );
  }
}

class _TimelineBar extends StatelessWidget {
  final int startYear;
  final int endYear;
  final int? discoveryYear;

  const _TimelineBar({
    required this.startYear,
    required this.endYear,
    this.discoveryYear,
  });

  @override
  Widget build(BuildContext context) {
    const int timelineStart = -3300;
    final int timelineEnd = DateTime.now().year;

    final int safeMin = startYear <= endYear ? startYear : endYear;
    final int safeMax = startYear <= endYear ? endYear : startYear;
    final int safeDiscoveryYear = discoveryYear ?? timelineStart;
    final totalSpan = (timelineEnd - timelineStart).abs();

    final double periodStartRatio =
        ((safeMin - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );
    final double periodEndRatio =
        ((safeMax - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );

    final bool showDiscovery = discoveryYear != null;
    final double ratio = showDiscovery
        ? ((safeDiscoveryYear - timelineStart) /
                  (totalSpan == 0 ? 1 : totalSpan))
              .clamp(0.0, 1.0)
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 24,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final double markerLeft = (ratio * constraints.maxWidth) - 5;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: constraints.maxWidth * periodStartRatio,
                    child: Container(
                      width:
                          constraints.maxWidth *
                          (periodEndRatio - periodStartRatio),
                      height: 8,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primaryVariant, AppColors.primary],
                        ),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  if (showDiscovery)
                    Positioned(
                      left: markerLeft,
                      top: 2,
                      child: const _DiscoveryPin(),
                    ),
                ],
              );
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              formatYear(timelineStart),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
            if (showDiscovery)
              Text(
                'Desc.: ${formatYear(safeDiscoveryYear)}',
                style: const TextStyle(color: Colors.white, fontSize: 11),
              ),
            Text(
              formatYear(timelineEnd),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
      ],
    );
  }

  String formatYear(int year) {
    if (year < 0) {
      return '${year.abs()} a. C.';
    }
    return '$year d. C.';
  }
}

class _DiscoveryPin extends StatelessWidget {
  const _DiscoveryPin();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 20,
      alignment: Alignment.topCenter,
      child: Column(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primary, width: 2),
            ),
          ),
          Container(width: 2, height: 10, color: Colors.white),
        ],
      ),
    );
  }
}
