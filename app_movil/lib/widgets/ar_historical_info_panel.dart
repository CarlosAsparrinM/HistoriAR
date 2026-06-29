import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../styles/app_colors.dart';

class ArHistoricalInfoPanel extends StatefulWidget {
  final Monument monument;
  final bool isExpanded;

  const ArHistoricalInfoPanel({
    super.key,
    required this.monument,
    this.isExpanded = false,
  });

  @override
  State<ArHistoricalInfoPanel> createState() => _ArHistoricalInfoPanelState();
}

class _ArHistoricalInfoPanelState extends State<ArHistoricalInfoPanel>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _expandAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _expandAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    if (widget.isExpanded) {
      _animationController.forward();
    }
  }

  @override
  void didUpdateWidget(ArHistoricalInfoPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isExpanded && !oldWidget.isExpanded) {
      _animationController.forward();
    } else if (!widget.isExpanded && oldWidget.isExpanded) {
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
    return AnimatedBuilder(
      animation: _expandAnimation,
      builder: (context, child) {
        final maxHeight = 280.0 * _expandAnimation.value;

        return Container(
          constraints: BoxConstraints(maxHeight: maxHeight),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.black.withValues(alpha: 0.85),
                Colors.black.withValues(alpha: 0.75),
              ],
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
            ),
            border: Border(
              top: BorderSide(
                color: AppColors.primary.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 12,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            child: Opacity(
              opacity: _expandAnimation.value,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionTitle('📚 Información Histórica'),
                    const SizedBox(height: 12),
                    if (widget.monument.culture != null &&
                        widget.monument.culture!.isNotEmpty)
                      _buildInfoRow('Cultura', widget.monument.culture!),
                    if (widget.monument.periodName != null &&
                        widget.monument.periodName!.isNotEmpty)
                      _buildInfoRow('Período', widget.monument.periodName!),
                    if (widget.monument.periodIsIdentified &&
                        widget.monument.periodStartYear != null)
                      _buildInfoRow(
                        'Años',
                        '${widget.monument.periodStartYear} - ${widget.monument.periodEndYear ?? 'Presente'}',
                      ),
                    if (widget.monument.discoveryIsDiscovererKnown &&
                        widget.monument.discoveryDiscovererName != null)
                      _buildInfoRow(
                        'Descubridor',
                        widget.monument.discoveryDiscovererName!,
                      ),
                    if (widget.monument.discoveryIsDateKnown &&
                        widget.monument.discoveryDiscoveredAt != null)
                      _buildInfoRow(
                        'Descubierto',
                        '${widget.monument.discoveryDiscoveredAt!.day}/${widget.monument.discoveryDiscoveredAt!.month}/${widget.monument.discoveryDiscoveredAt!.year}',
                      ),
                    if (widget.monument.district != null &&
                        widget.monument.district!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildInfoRow('Distrito', widget.monument.district!),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 14,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12,
                height: 1.4,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
