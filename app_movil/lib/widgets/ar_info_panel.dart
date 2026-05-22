import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../styles/app_colors.dart';

/// Panel de información flotante y personalizable del monumento durante AR.
/// Puede minimizarse/expandirse y desplazarse.
class ArInfoPanel extends StatefulWidget {
  final Monument monument;
  final bool visible;
  final VoidCallback? onDismiss;
  final bool showTimeline;

  const ArInfoPanel({
    super.key,
    required this.monument,
    this.visible = true,
    this.onDismiss,
    this.showTimeline = true,
  });

  @override
  State<ArInfoPanel> createState() => _ArInfoPanelState();
}

class _ArInfoPanelState extends State<ArInfoPanel>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 320),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
        );

    if (widget.visible) {
      _animationController.forward();
    }
  }

  @override
  void didUpdateWidget(ArInfoPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && !oldWidget.visible) {
      _animationController.forward();
    } else if (!widget.visible && oldWidget.visible) {
      _animationController.reverse();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible) return const SizedBox.shrink();

    return SlideTransition(
      position: _slideAnimation,
      child: GestureDetector(
        onVerticalDragUpdate: (details) {
          if (details.delta.dy > 0 && _isExpanded) {
            setState(() => _isExpanded = false);
          }
        },
        child: AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOutCubic,
          child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.primary.withOpacity(0.3),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: _isExpanded ? _buildExpanded() : _buildCollapsed(),
        ),
      ),
    );
  }

  Widget _buildCollapsed() {
    final monument = widget.monument;
    return GestureDetector(
      onTap: () => setState(() => _isExpanded = true),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        monument.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      if ((monument.culture ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            monument.culture!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Icon(Icons.expand_less, color: Colors.white.withOpacity(0.7)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpanded() {
    final monument = widget.monument;
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header expandido
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        monument.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      if ((monument.district ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '📍 ${monument.district}',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => setState(() => _isExpanded = false),
                  child: Icon(
                    Icons.expand_more,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Información principal
            if ((monument.culture ?? '').isNotEmpty) ...[
              _InfoBadge('Cultura', monument.culture!),
              const SizedBox(height: 8),
            ],
            _InfoBadge('Periodo', _buildPeriodText(monument)),
            const SizedBox(height: 8),
            _InfoBadge('Descubrimiento', _buildDiscoveryText(monument)),
            const SizedBox(height: 12),
            // Descripción
            Text(
              monument.description,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 13,
                height: 1.5,
              ),
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
            ),
            if (widget.showTimeline) ...[
              const SizedBox(height: 16),
              _buildTimelinePreview(monument),
            ],
          ],
        ),
      ),
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
              : 'No especificado')
        : 'Desconocido';

    return '$dateText • $discovererText';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Fecha desconocida';
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return '$day/$month/$year';
  }

  Widget _buildTimelinePreview(Monument monument) {
    if (monument.periodStartYear == null || monument.periodEndYear == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1), width: 1),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline, color: AppColors.primary, size: 14),
              const SizedBox(width: 6),
              Text(
                'Línea de tiempo',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _calculateTimelineProgress(monument),
              minHeight: 6,
              backgroundColor: Colors.white.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(
                AppColors.primary.withOpacity(0.8),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${monument.periodStartYear}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 10,
                  ),
                ),
                Text(
                  '${monument.periodEndYear}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  double _calculateTimelineProgress(Monument monument) {
    final start = monument.periodStartYear ?? 0;
    final end = monument.periodEndYear ?? 0;
    const timelineStart = -3300;
    final timelineEnd = DateTime.now().year;
    final totalSpan = timelineEnd - timelineStart;

    if (totalSpan <= 0) return 0.5;

    final safeStart = start <= end ? start : end;
    final safeEnd = start <= end ? end : start;

    final progress = ((safeEnd - timelineStart) / totalSpan).clamp(0.0, 1.0);
    return progress;
  }
}

class _InfoBadge extends StatelessWidget {
  final String label;
  final String value;

  const _InfoBadge(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
