import { AuthService } from '../../services/auth.js';
import { StrategicObjective } from '../../Entities/StrategicObjective.js';
import { StrategicSubMetric, CATEGORY_METRIC_CONFIG } from '../../Entities/StrategicSubMetric.js';
import { CompanyPolicy } from '../../Entities/CompanyPolicy.js';
import { Cycle } from '../../Entities/Cycle.js';

const HomePage = {
    async render() {
        const content = document.getElementById('content');
        content.innerHTML = SkeletonLoader.home();

        this.addStyles();

        const user = AuthService.getCurrentUser();
        const isAdmin = AuthService.isAdmin();

        const [strategicObjs, cycles, policies] = await Promise.all([
            StrategicObjective.getAll(),
            Cycle.getAll(),
            CompanyPolicy.getAll()
        ]);

        const activeCycle = cycles.find(c => c.ativo);

        content.innerHTML = `
            <div class="hp-page">
                <div class="hp-welcome-wrap"></div>
                <div class="hp-main-grid">
                    <div class="hp-col-left">
                        <div id="hp-policies" class="hp-cell"></div>
                        <div id="hp-shortcuts" class="hp-cell"></div>
                    </div>
                    <div class="hp-col-right">
                        <div id="hp-strategic" class="hp-cell"></div>
                    </div>
                </div>
            </div>
        `;

        this.renderWelcome(user, activeCycle);
        this.renderPolicies(policies, isAdmin);
        this.renderShortcuts(isAdmin);

        // Load sub-metrics for each objective to calculate progress
        const objProgress = {};
        await Promise.all(strategicObjs.map(async (obj) => {
            const catConfig = CATEGORY_METRIC_CONFIG[obj.category];
            if (!catConfig || catConfig.metric_mode === 'qualitative') {
                objProgress[obj.id] = null;
                return;
            }

            let subMetrics;
            if (catConfig.metric_mode === 'auto_okr' && activeCycle) {
                subMetrics = await StrategicSubMetric.getAutoOkrMetrics(obj.id, activeCycle.id);
            } else {
                subMetrics = await StrategicSubMetric.getByObjectiveId(obj.id);
            }

            if (!subMetrics || subMetrics.length === 0) {
                objProgress[obj.id] = null;
                return;
            }

            if (catConfig.metric_mode === 'normal') {
                const totalCurrent = subMetrics.reduce((s, m) => s + m.current_value, 0);
                const totalTarget = subMetrics.reduce((s, m) => s + m.target_value, 0);
                objProgress[obj.id] = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;
            } else if (catConfig.metric_mode === 'inverse') {
                const avgCurrent = subMetrics.reduce((s, m) => s + m.current_value, 0) / subMetrics.length;
                const avgTarget = subMetrics.reduce((s, m) => s + m.target_value, 0) / subMetrics.length;
                objProgress[obj.id] = avgTarget > 0 ? Math.min(Math.max(Math.round((1 - avgCurrent / avgTarget) * 100), 0), 100) : 0;
            } else if (catConfig.metric_mode === 'auto_okr') {
                const avgProgress = subMetrics.reduce((s, m) => s + m.progress, 0) / subMetrics.length;
                objProgress[obj.id] = Math.round(avgProgress);
            }
        }));

        this.renderStrategicSummary(strategicObjs, isAdmin, objProgress);
    },

    renderWelcome(user, activeCycle) {
        const wrap = document.querySelector('.hp-welcome-wrap');
        const firstName = user ? user.nome.split(' ')[0] : 'Usuário';
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
        const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        wrap.innerHTML = `
            <div class="hp-welcome">
                <div class="hp-welcome-left">
                    <h1 class="hp-greeting">${greeting}, <strong>${firstName}!</strong></h1>
                    <p class="hp-welcome-sub">Acompanhe o progresso dos objetivos e resultados da empresa.</p>
                </div>
                <div class="hp-welcome-right">
                    ${activeCycle ? `
                        <div class="hp-cycle-pill">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            ${activeCycle.nome}
                        </div>
                    ` : ''}
                    <span class="hp-date">${dateStr}</span>
                </div>
            </div>
        `;
    },

    renderPolicies(policies, isAdmin) {
        const container = document.getElementById('hp-policies');

        if (policies.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = `
            <div class="widget hp-widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Políticas da Empresa
                    <span class="hp-header-count">${policies.length}</span>
                    ${isAdmin ? `<a class="hp-header-link" onclick="Layout.navigate('company-policy')">Gerenciar →</a>` : ''}
                </div>
                <div class="widget-body hp-policies-body">
                    <div class="hp-policies-list">
                        ${policies.map(p => `
                            <div class="hp-policy-item">
                                <div class="hp-policy-icon">${CompanyPolicy.getIconSVG(p.icon, 16)}</div>
                                <div class="hp-policy-content">
                                    ${p.title ? `<span class="hp-policy-title">${p.title}</span>` : ''}
                                    ${p.description ? `<span class="hp-policy-desc">${p.description.length > 100 ? p.description.substring(0, 100) + '...' : p.description}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderStrategicSummary(strategicObjs, isAdmin, objProgress = {}) {
        const container = document.getElementById('hp-strategic');

        const color = '#12b0a0';

        const byCategory = {};
        strategicObjs.forEach(obj => {
            if (!byCategory[obj.category]) byCategory[obj.category] = [];
            byCategory[obj.category].push(obj);
        });

        const categoriesHTML = Object.entries(byCategory).map(([cat, objs]) => {
            return `
                <div class="hp-cat-group">
                    <div class="hp-cat-header">
                        <div class="hp-cat-dot" style="background:${color};"></div>
                        <span class="hp-cat-name">${cat}</span>
                        <span class="hp-cat-badge" style="background:${color}15;color:${color};">${objs.length}</span>
                    </div>
                    <div class="hp-cat-items">
                        ${objs.map(obj => {
                            const pct = objProgress[obj.id];
                            const hasProgress = pct !== null && pct !== undefined;
                            return `
                            <a class="hp-obj-card" onclick="Layout.navigate('strategic-objective-detail', '/objetivos-estrategicos/${obj.id}')" title="${obj.text.replace(/"/g, '&quot;')}">
                                <div class="hp-obj-color" style="background:${color};"></div>
                                <div class="hp-obj-body">
                                    <div class="hp-obj-row">
                                        <span class="hp-obj-text">${obj.text}</span>
                                        <svg class="hp-obj-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                    </div>
                                    ${hasProgress ? `
                                    <div class="hp-obj-progress-wrap">
                                        <div class="hp-obj-progress-bar">
                                            <div class="hp-obj-progress-fill" style="width:${pct}%;"></div>
                                        </div>
                                        <span class="hp-obj-pct">${pct}%</span>
                                    </div>` : ''}
                                </div>
                            </a>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="widget hp-widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                    Objetivos Estratégicos
                    <span class="hp-header-count">${strategicObjs.length}</span>
                    ${isAdmin ? `<a class="hp-header-link" onclick="Layout.navigate('strategic-objectives')">Ver todos →</a>` : ''}
                </div>
                <div class="widget-body hp-scroll-body">
                    ${categoriesHTML || `
                        <div class="hp-empty">
                            <svg width="28" height="28" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                            <p>Nenhum objetivo estratégico cadastrado</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderShortcuts(isAdmin) {
        const container = document.getElementById('hp-shortcuts');

        const shortcuts = [
            { label: 'Meus OKRs', page: 'my-okrs', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>' },
            { label: 'Todos os OKRs', page: 'okrs', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>' },
            { label: 'Dashboard de OKRs', page: 'dashboard', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>' },
            { label: 'Calendário', page: 'calendar', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' },
            { label: 'Ciclos', page: 'cycles', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>' }
        ];

        if (isAdmin) {
            shortcuts.push(
                { label: 'Obj. Estratégicos', page: 'strategic-objectives', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' },
                { label: 'Comitê de Aprovação', page: 'approval', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>' }
            );
        }

        container.innerHTML = `
            <div class="widget hp-widget">
                <div class="widget-header">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Acesso Rápido
                </div>
                <div class="widget-body">
                    <div class="hp-shortcuts-grid">
                        ${shortcuts.map(s => `
                            <a class="hp-shortcut" onclick="Layout.navigate('${s.page}')">
                                <div class="hp-shortcut-icon">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">${s.icon}</svg>
                                </div>
                                <span class="hp-shortcut-label">${s.label}</span>
                                <svg class="hp-shortcut-arrow" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    addStyles() {
        if (document.getElementById('hp-styles')) return;
        const style = document.createElement('style');
        style.id = 'hp-styles';
        style.textContent = `
            .hp-page {
                display: flex;
                flex-direction: column;
                gap: 16px;
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }

            /* ===== WELCOME ===== */
            .hp-welcome {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(135deg, var(--top-blue-dark) 0%, var(--top-teal-dark) 60%, var(--top-teal) 100%);
                border-radius: var(--radius-lg);
                padding: 20px 26px;
                color: #fff;
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
            }
            .hp-welcome::before {
                content: '';
                position: absolute;
                top: -60%;
                right: -8%;
                width: 200px;
                height: 200px;
                background: rgba(255,255,255,0.06);
                border-radius: 50%;
            }
            .hp-welcome-left { position: relative; z-index: 1; }
            .hp-greeting {
                font-size: 18px;
                font-weight: 400;
                margin: 0;
                line-height: 1.3;
            }
            .hp-greeting strong { font-weight: 800; }
            .hp-welcome-sub {
                margin: 3px 0 0 0;
                font-size: 13px;
                opacity: 0.7;
            }
            .hp-welcome-right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 5px;
                position: relative;
                z-index: 1;
                flex-shrink: 0;
            }
            .hp-cycle-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(255,255,255,0.15);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 20px;
                padding: 4px 14px;
                font-size: 12px;
                font-weight: 600;
                backdrop-filter: blur(6px);
            }
            .hp-date {
                font-size: 11px;
                opacity: 0.55;
                text-transform: capitalize;
            }

            /* ===== GRID LAYOUT ===== */
            .hp-main-grid {
                display: grid;
                grid-template-columns: minmax(300px, 1fr) 1.5fr;
                gap: 16px;
                flex: 1;
                min-height: 0;
            }
            .hp-col-left {
                display: flex;
                flex-direction: column;
                gap: 16px;
                min-height: 0;
            }
            .hp-col-right {
                min-height: 0;
                min-width: 0;
            }
            .hp-cell { min-height: 0; }
            .hp-widget {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-width: 0;
            }
            .hp-widget .widget-body { flex: 1; min-height: 0; min-width: 0; }
            .hp-scroll-body {
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--border) transparent;
            }
            .hp-scroll-body::-webkit-scrollbar { width: 4px; }
            .hp-scroll-body::-webkit-scrollbar-track { background: transparent; }
            .hp-scroll-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

            /* ===== WIDGET HEADER ===== */
            .hp-header-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 20px;
                height: 20px;
                padding: 0 6px;
                border-radius: 10px;
                background: var(--bg-hover);
                font-size: 11px;
                font-weight: 700;
                color: var(--text-secondary);
            }
            .hp-header-link {
                margin-left: auto;
                font-size: 12px;
                font-weight: 600;
                color: var(--top-teal);
                cursor: pointer;
                white-space: nowrap;
            }
            .hp-header-link:hover { opacity: 0.7; }

            .hp-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 40px 20px;
            }
            .hp-empty p { color: var(--text-muted); font-size: 13px; margin: 0; }

            /* ===== POLICIES ===== */
            .hp-policies-body { padding: 0; }
            .hp-policies-list {
                display: flex;
                flex-direction: column;
            }
            .hp-policy-item {
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border);
                align-items: flex-start;
            }
            .hp-policy-item:last-child { border-bottom: none; }
            .hp-policy-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: linear-gradient(135deg, var(--top-teal) 0%, var(--top-teal-dark, #0d9488) 100%);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                margin-top: 1px;
            }
            .hp-policy-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
            .hp-policy-title {
                font-size: 13px;
                font-weight: 700;
                color: var(--text-primary);
                line-height: 1.3;
            }
            .hp-policy-desc {
                font-size: 12px;
                color: var(--text-muted);
                line-height: 1.4;
            }

            /* ===== STRATEGIC OBJECTIVES ===== */
            .hp-cat-group { margin-bottom: 12px; }
            .hp-cat-group:last-child { margin-bottom: 0; }
            .hp-cat-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
                padding: 4px 0;
            }
            .hp-cat-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .hp-cat-name {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-primary);
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            .hp-cat-badge {
                font-size: 10px;
                font-weight: 700;
                border-radius: 10px;
                padding: 1px 7px;
            }
            .hp-cat-items {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }
            .hp-obj-card {
                display: flex;
                align-items: stretch;
                gap: 0;
                padding: 0;
                background: #fff;
                border: 1px solid var(--border);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.15s;
                min-width: 0;
                overflow: hidden;
            }
            .hp-obj-card:hover {
                border-color: var(--top-teal, #12b0a0);
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.1);
            }
            .hp-obj-color {
                width: 4px;
                flex-shrink: 0;
                align-self: stretch;
            }
            .hp-obj-body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 10px 14px;
            }
            .hp-obj-row {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                min-width: 0;
            }
            .hp-obj-text {
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.4;
                flex: 1;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .hp-obj-progress-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .hp-obj-progress-bar {
                flex: 1;
                height: 4px;
                border-radius: 2px;
                background: rgba(18, 176, 160, 0.12);
                overflow: hidden;
            }
            .hp-obj-progress-fill {
                height: 100%;
                border-radius: 2px;
                background: var(--top-teal, #12b0a0);
                transition: width 0.4s ease;
            }
            .hp-obj-pct {
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
                white-space: nowrap;
                min-width: 32px;
                text-align: right;
                color: var(--top-teal, #12b0a0);
            }
            .hp-obj-arrow {
                flex-shrink: 0;
                color: var(--text-muted);
                opacity: 0;
                transition: opacity 0.15s, transform 0.15s;
                margin-top: 2px;
            }
            .hp-obj-card:hover .hp-obj-arrow {
                opacity: 1;
                transform: translateX(2px);
            }

            /* ===== SHORTCUTS ===== */
            .hp-shortcuts-grid { display: flex; flex-direction: column; gap: 2px; }
            .hp-shortcut {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: var(--radius);
                cursor: pointer;
                transition: background 0.15s;
            }
            .hp-shortcut:hover { background: var(--bg-hover); }
            .hp-shortcut-icon {
                width: 30px;
                height: 30px;
                border-radius: var(--radius);
                background: var(--bg-hover);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: var(--top-teal);
                transition: all 0.2s;
            }
            .hp-shortcut:hover .hp-shortcut-icon { background: var(--top-teal); color: #fff; }
            .hp-shortcut-label { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
            .hp-shortcut-arrow {
                color: var(--text-muted);
                opacity: 0;
                transition: opacity 0.2s, transform 0.2s;
                flex-shrink: 0;
            }
            .hp-shortcut:hover .hp-shortcut-arrow { opacity: 1; transform: translateX(2px); }

            /* ===== RESPONSIVE ===== */
            @media (max-width: 900px) {
                .hp-main-grid { grid-template-columns: 1fr; }
                .hp-col-left { flex-direction: row; }
                .hp-col-left > * { flex: 1; }
            }
            @media (max-width: 600px) {
                .hp-page { padding: 16px; margin: -16px; }
                .hp-welcome { flex-direction: column; text-align: center; gap: 10px; padding: 18px 20px; }
                .hp-welcome-right { align-items: center; }
                .hp-greeting { font-size: 17px; }
                .hp-col-left { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    }
};

export { HomePage };
window.HomePage = HomePage;
