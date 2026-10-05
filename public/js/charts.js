/**
 * SilverSaaS Dynamic SVG Charts Engine
 * Zero dependencies, ultra-crisp vector rendering with silver/chrome styling
 */

const SilverCharts = {
  /**
   * Render an interactive Line / Area Chart with silver gradients
   */
  renderAreaChart(container, data, options = {}) {
    if (!container) return;
    const width = options.width || 680;
    const height = options.height || 240;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No data available</div>';
      return;
    }

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 100);
    const minValue = 0;

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier curves
      const prev = points[i - 1];
      const cur = points[i];
      const cp1x = prev.x + (cur.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (cur.x - prev.x) / 2;
      const cp2y = cur.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cur.x} ${cur.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
        <defs>
          <linearGradient id="silverAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#e2e8f0" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="silverStrokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#94a3b8"/>
            <stop offset="50%" stop-color="#475569"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
          <filter id="silverDropGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#64748b" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Horizontal Grid Lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + chartHeight * ratio;
          const val = Math.round(maxValue * (1 - ratio));
          return `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4" />
            <text x="${padding.left - 12}" y="${y + 4}" fill="#94a3b8" font-size="11" text-anchor="end" font-weight="500">$${val.toLocaleString()}</text>
          `;
        }).join('')}

        <!-- Gradient Area Fill -->
        <path d="${areaD}" fill="url(#silverAreaGrad)" />

        <!-- Line Stroke -->
        <path d="${pathD}" fill="none" stroke="url(#silverStrokeGrad)" stroke-width="3" filter="url(#silverDropGlow)" stroke-linecap="round" />

        <!-- Data Nodes & Labels -->
        ${points.map(p => `
          <g class="chart-point" style="cursor:pointer;">
            <circle cx="${p.x}" cy="${p.y}" r="6" fill="#ffffff" stroke="#334155" stroke-width="2.5" />
            <circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#334155" />
            <text x="${p.x}" y="${padding.top + chartHeight + 22}" fill="#64748b" font-size="11" text-anchor="middle" font-weight="600">${p.label}</text>
            <title>${p.label}: $${p.value.toLocaleString()}</title>
          </g>
        `).join('')}
      </svg>
    `;

    container.innerHTML = svg;
  },

  /**
   * Render Horizontal Bar or Meter
   */
  renderMeter(container, value, max = 100, label = '') {
    if (!container) return;
    const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.8rem; font-weight:600; color:#475569;">
        <span>${label}</span>
        <span>${pct}%</span>
      </div>
      <div style="width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; border:1px solid #cbd5e1;">
        <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #94a3b8, #475569); border-radius:999px; transition:width 0.6s ease;"></div>
      </div>
    `;
  }
};

window.SilverCharts = SilverCharts;
