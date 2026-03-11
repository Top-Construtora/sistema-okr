// SkeletonLoader - Skeleton loading baseado na estrutura real de cada página
const SkeletonLoader = {

    ensureStyles() {
        if (document.getElementById('skeleton-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-global-styles';
        style.textContent = `
            .sk-line {
                height: 12px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skShimmer 1.5s infinite;
                border-radius: 4px;
            }
            .sk-circle {
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skShimmer 1.5s infinite;
            }
            .sk-pulse {
                animation: skPulse 1.5s ease-in-out infinite;
            }
            @keyframes skShimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            @keyframes skPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    },

    // Helper para gerar linhas de tabela skeleton
    _tableRow(cells) {
        return `<tr class="sk-pulse">${cells.map(c => `<td${c.style ? ` style="${c.style}"` : ''}>${c.html}</td>`).join('')}</tr>`;
    },

    // =====================================================
    // USERS - Espelha: page-gio-users > page-actions-gio + card-gio > table-gio (Usuário, Email, Departamento, Tipo, Ações)
    // =====================================================
    users() {
        this.ensureStyles();
        const rows = Array.from({length: 5}, () => this._tableRow([
            { html: `<div class="table-cell-info"><div class="sk-circle" style="width:36px;height:36px;min-width:36px;"></div><div class="user-details-gio"><div class="sk-line" style="width:120px;height:14px;margin-bottom:4px;"></div><div class="sk-line" style="width:50px;height:10px;"></div></div></div>` },
            { html: `<div class="sk-line" style="width:160px;"></div>`, style: '' },
            { html: `<div class="sk-line" style="width:90px;height:22px;border-radius:20px;"></div>`, style: '' },
            { html: `<div class="sk-line" style="width:60px;height:22px;border-radius:20px;margin:0 auto;"></div>`, style: 'text-align:center;' },
            { html: `<div class="action-buttons"><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div></div>`, style: 'text-align:center;' }
        ])).join('');

        return `
            <div class="page-gio-users">
                <div class="page-actions-gio">
                    <div class="sk-line" style="width:140px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="card-gio sk-pulse">
                    <div class="table-gio-container">
                        <table class="table-gio">
                            <thead>
                                <tr>
                                    <th style="min-width:200px;">Usuário</th>
                                    <th style="min-width:180px;">Email</th>
                                    <th style="min-width:140px;">Departamento</th>
                                    <th style="min-width:90px;text-align:center;">Tipo</th>
                                    <th style="width:100px;text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // DEPARTMENTS - Espelha: page-gio > page-actions-gio + card-gio > table-gio (Departamento, Status, Ações)
    // =====================================================
    departments() {
        this.ensureStyles();
        const rows = Array.from({length: 5}, () => this._tableRow([
            { html: `<div class="table-cell-info"><div class="sk-circle" style="width:32px;height:32px;min-width:32px;"></div><div class="sk-line" style="width:140px;height:14px;"></div></div>` },
            { html: `<div class="sk-line" style="width:60px;height:22px;border-radius:20px;margin:0 auto;"></div>`, style: 'text-align:center;' },
            { html: `<div class="action-buttons"><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div></div>`, style: 'text-align:center;' }
        ])).join('');

        return `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <div class="sk-line" style="width:170px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="card-gio sk-pulse">
                    <div class="table-gio-container">
                        <table class="table-gio">
                            <thead>
                                <tr>
                                    <th>Departamento</th>
                                    <th style="width:100px;text-align:center;">Status</th>
                                    <th style="width:80px;text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // COMPANY POLICY - Espelha: page-gio > page-actions-gio + card-gio > table-gio (Título, Descrição, Ações)
    // =====================================================
    companyPolicy() {
        this.ensureStyles();
        const rows = Array.from({length: 4}, () => this._tableRow([
            { html: `<div class="table-cell-info"><div class="sk-circle" style="width:32px;height:32px;min-width:32px;"></div><div class="sk-line" style="width:150px;height:14px;"></div></div>` },
            { html: `<div class="sk-line" style="width:85%;"></div>` },
            { html: `<div class="action-buttons"><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div></div>`, style: 'text-align:center;' }
        ])).join('');

        return `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <div class="sk-line" style="width:130px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="card-gio sk-pulse">
                    <div class="table-gio-container">
                        <table class="table-gio">
                            <thead>
                                <tr>
                                    <th style="min-width:200px;">Título</th>
                                    <th>Descrição</th>
                                    <th style="width:80px;text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // OBJECTIVES - Espelha: page-gio > page-actions-gio (filter-buttons + btn) + card-gio > table-gio
    // =====================================================
    objectives() {
        this.ensureStyles();
        const rows = Array.from({length: 5}, () => this._tableRow([
            { html: `<div class="sk-line" style="width:80px;height:24px;border-radius:20px;"></div>` },
            { html: `<div class="sk-line" style="width:90%;height:14px;margin-bottom:6px;"></div><div class="sk-line" style="width:50%;height:10px;"></div>` },
            { html: `<div class="sk-line" style="width:40px;height:22px;border-radius:20px;margin:0 auto;"></div>`, style: 'text-align:center;' },
            { html: `<div class="action-buttons"><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div></div>`, style: 'text-align:center;' }
        ])).join('');

        return `
            <div class="page-gio">
                <div class="page-actions-gio" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                    <div class="filter-buttons-gio">
                        <div class="sk-line" style="width:70px;height:32px;border-radius:8px;display:inline-block;"></div>
                        <div class="sk-line" style="width:80px;height:32px;border-radius:8px;display:inline-block;"></div>
                        <div class="sk-line" style="width:95px;height:32px;border-radius:8px;display:inline-block;"></div>
                        <div class="sk-line" style="width:75px;height:32px;border-radius:8px;display:inline-block;"></div>
                    </div>
                    <div class="sk-line" style="width:140px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="card-gio sk-pulse" style="margin-top:20px;">
                    <div class="table-gio-container">
                        <table class="table-gio">
                            <thead>
                                <tr>
                                    <th>Categoria</th>
                                    <th>Objetivo</th>
                                    <th style="text-align:center;">OKRs</th>
                                    <th style="text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // CYCLES - Espelha: page-gio > cycle-card-gio (header com nome, datas, stats + grid de miniciclos)
    // =====================================================
    cycles() {
        this.ensureStyles();
        return `
            <div class="page-gio">
                ${Array.from({length: 2}, () => `
                    <div class="card-gio sk-pulse" style="margin-bottom:16px;">
                        <div style="padding:20px;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                                <div>
                                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                                        <div class="sk-line" style="width:180px;height:20px;"></div>
                                        <div class="sk-line" style="width:50px;height:22px;border-radius:20px;"></div>
                                    </div>
                                    <div style="display:flex;gap:16px;align-items:center;">
                                        <div class="sk-line" style="width:200px;height:12px;"></div>
                                        <div class="sk-line" style="width:140px;height:12px;"></div>
                                    </div>
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div>
                                    <div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;">
                                ${Array.from({length: 3}, () => `
                                    <div style="border:1px solid var(--border-light);border-radius:10px;padding:12px;">
                                        <div class="sk-line" style="width:70%;height:13px;margin-bottom:6px;"></div>
                                        <div class="sk-line" style="width:50%;height:10px;"></div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    },

    // =====================================================
    // APPROVAL - Espelha: page-gio approval-page-gio > kanban-container-gio > kanban-board-gio (5 colunas)
    // =====================================================
    approval() {
        this.ensureStyles();
        const columns = [
            { title: 'Aguardando Revisão', color: '#f59e0b' },
            { title: 'Ajustes Solicitados', color: '#ef4444' },
            { title: 'Em Andamento', color: '#3b82f6' },
            { title: 'Concluídos', color: '#10b981' },
            { title: 'Homologados', color: '#8b5cf6' }
        ];

        return `
            <div class="page-gio approval-page-gio">
                <div class="kanban-container-gio">
                    <div class="kanban-scroll-area-gio">
                        <div class="kanban-board-gio">
                            ${columns.map(col => `
                                <div class="kanban-col-gio">
                                    <div class="kanban-col-header-gio" style="border-top:3px solid ${col.color};">
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <div class="sk-circle" style="width:20px;height:20px;"></div>
                                            <span style="color:var(--text-muted);font-size:13px;font-weight:600;">${col.title}</span>
                                        </div>
                                        <div class="sk-line" style="width:24px;height:24px;border-radius:50%;"></div>
                                    </div>
                                    <div class="kanban-col-body-gio">
                                        ${Array.from({length: 2}, () => `
                                            <div class="card-gio sk-pulse" style="padding:14px;margin-bottom:8px;">
                                                <div class="sk-line" style="width:85%;height:14px;margin-bottom:10px;"></div>
                                                <div class="sk-line" style="width:60%;margin-bottom:10px;"></div>
                                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                                    <div class="sk-line" style="width:80px;height:20px;border-radius:20px;"></div>
                                                    <div class="sk-circle" style="width:28px;height:28px;"></div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // CALENDAR - Espelha: page-gio calendar-page-gio > calendar-main-gio + reminders-panel-gio
    // =====================================================
    calendar() {
        this.ensureStyles();
        return `
            <div class="page-gio calendar-page-gio">
                <div class="calendar-main-gio">
                    <div class="calendar-filters-gio">
                        <div class="sk-line" style="width:120px;height:14px;display:inline-block;"></div>
                        <div class="sk-line" style="width:140px;height:14px;display:inline-block;margin-left:12px;"></div>
                        <div class="sk-line" style="width:130px;height:14px;display:inline-block;margin-left:12px;"></div>
                    </div>
                    <div class="card-gio sk-pulse" style="padding:20px;min-height:400px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                            <div class="sk-line" style="width:150px;height:20px;"></div>
                            <div style="display:flex;gap:8px;">
                                <div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div>
                                <div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
                            ${Array.from({length: 7}, () => `<div class="sk-line" style="height:16px;margin-bottom:8px;"></div>`).join('')}
                            ${Array.from({length: 35}, () => `<div class="sk-line" style="height:44px;border-radius:6px;"></div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="reminders-panel-gio">
                    <div class="reminders-header-gio">
                        <div class="sk-line" style="width:90px;height:18px;"></div>
                        <div class="sk-line" style="width:70px;height:30px;border-radius:8px;"></div>
                    </div>
                    <div class="sk-line" style="width:100%;height:14px;margin:12px 0;"></div>
                    ${Array.from({length: 3}, () => `
                        <div style="padding:10px 0;border-bottom:1px solid var(--border-light);display:flex;align-items:center;gap:10px;">
                            <div class="sk-circle" style="width:8px;height:8px;min-width:8px;"></div>
                            <div style="flex:1;">
                                <div class="sk-line" style="width:80%;margin-bottom:4px;"></div>
                                <div class="sk-line" style="width:50%;height:10px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    // =====================================================
    // HOME - Espelha: hp-page > hp-welcome-wrap + hp-main-grid (hp-col-left + hp-col-right)
    // =====================================================
    home() {
        this.ensureStyles();
        return `
            <div class="hp-page">
                <div class="hp-welcome-wrap">
                    <div class="card-gio sk-pulse" style="height:70px;display:flex;align-items:center;padding:0 24px;">
                        <div>
                            <div class="sk-line" style="width:250px;height:18px;margin-bottom:8px;"></div>
                            <div class="sk-line" style="width:180px;height:12px;"></div>
                        </div>
                    </div>
                </div>
                <div class="hp-main-grid">
                    <div class="hp-col-left">
                        <div class="hp-cell">
                            <div class="card-gio sk-pulse" style="padding:20px;">
                                <div class="sk-line" style="width:50%;height:16px;margin-bottom:16px;"></div>
                                ${Array.from({length: 3}, () => `
                                    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);">
                                        <div class="sk-circle" style="width:32px;height:32px;min-width:32px;"></div>
                                        <div style="flex:1;">
                                            <div class="sk-line" style="width:70%;margin-bottom:4px;"></div>
                                            <div class="sk-line" style="width:90%;height:10px;"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="hp-cell">
                            <div class="card-gio sk-pulse" style="padding:20px;">
                                <div class="sk-line" style="width:40%;height:16px;margin-bottom:16px;"></div>
                                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                                    ${Array.from({length: 3}, () => `<div class="sk-line" style="height:60px;border-radius:10px;"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="hp-col-right">
                        <div class="hp-cell">
                            <div class="card-gio sk-pulse" style="padding:20px;min-height:340px;">
                                <div class="sk-line" style="width:55%;height:16px;margin-bottom:16px;"></div>
                                ${Array.from({length: 4}, () => `
                                    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);">
                                        <div class="sk-circle" style="width:36px;height:36px;min-width:36px;"></div>
                                        <div style="flex:1;">
                                            <div class="sk-line" style="width:70%;margin-bottom:6px;"></div>
                                            <div class="sk-line" style="width:40%;height:8px;"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // PROBLEM TREE - Espelha: page-gio > page-actions-gio (input + btn) + card-gio com tree header + table-gio
    // =====================================================
    problemTree() {
        this.ensureStyles();
        return `
            <div class="page-gio">
                <div class="page-actions-gio" style="gap:10px;">
                    <div class="sk-line" style="max-width:360px;flex:1;height:38px;border-radius:8px;"></div>
                    <div class="sk-line" style="width:130px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="pt-trees">
                    ${Array.from({length: 3}, () => `
                        <div class="card-gio sk-pulse" style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-light);">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <div class="sk-line" style="width:16px;height:16px;border-radius:3px;"></div>
                                    <div class="sk-line" style="width:160px;height:16px;"></div>
                                    <div class="sk-line" style="width:55px;height:22px;border-radius:20px;"></div>
                                </div>
                                <div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div>
                            </div>
                            <div style="padding:16px 20px;">
                                <div class="table-gio-container">
                                    <table class="table-gio">
                                        <thead>
                                            <tr>
                                                <th style="width:28%;text-align:left;">Tópico</th>
                                                <th style="width:30%;text-align:left;">Pergunta Norteadora</th>
                                                <th style="width:8%">G</th>
                                                <th style="width:8%">U</th>
                                                <th style="width:8%">T</th>
                                                <th style="width:8%">Nota</th>
                                                <th style="width:10%">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${Array.from({length: 3}, () => `
                                                <tr class="sk-pulse">
                                                    <td><div class="sk-line" style="width:85%;"></div></td>
                                                    <td><div class="sk-line" style="width:90%;"></div></td>
                                                    <td><div class="sk-line" style="width:30px;height:28px;border-radius:6px;margin:0 auto;"></div></td>
                                                    <td><div class="sk-line" style="width:30px;height:28px;border-radius:6px;margin:0 auto;"></div></td>
                                                    <td><div class="sk-line" style="width:30px;height:28px;border-radius:6px;margin:0 auto;"></div></td>
                                                    <td><div class="sk-line" style="width:40px;height:24px;border-radius:20px;margin:0 auto;"></div></td>
                                                    <td><div class="action-buttons"><div class="sk-line" style="width:32px;height:32px;border-radius:8px;"></div></div></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    // =====================================================
    // SWOT MATRIX - Espelha: page-gio > page-actions-gio + card-gio > sw-grid (2x2 com labels INTERNO/EXTERNO, POSITIVO/NEGATIVO)
    // =====================================================
    swotMatrix() {
        this.ensureStyles();
        return `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <div class="sk-line" style="width:100px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="card-gio sk-pulse" style="overflow:visible;">
                    <div class="sw-grid">
                        <div class="sw-label-row">
                            <div class="sw-corner"></div>
                            <div class="sw-col-label" style="color:var(--text-muted);">POSITIVO</div>
                            <div class="sw-col-label" style="color:var(--text-muted);">NEGATIVO</div>
                        </div>
                        <div class="sw-body-row">
                            <div class="sw-row-label" style="color:var(--text-muted);">INTERNO</div>
                            ${Array.from({length: 2}, () => `
                                <div class="sw-quadrant">
                                    <div class="sw-quadrant-header">
                                        <div class="sk-line" style="width:60%;height:16px;"></div>
                                    </div>
                                    <div class="sw-quadrant-body" style="min-height:120px;">
                                        ${Array.from({length: 3}, () => `<div class="sk-line" style="width:${65 + Math.floor(Math.random()*30)}%;margin-bottom:8px;"></div>`).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="sw-body-row">
                            <div class="sw-row-label" style="color:var(--text-muted);">EXTERNO</div>
                            ${Array.from({length: 2}, () => `
                                <div class="sw-quadrant">
                                    <div class="sw-quadrant-header">
                                        <div class="sk-line" style="width:60%;height:16px;"></div>
                                    </div>
                                    <div class="sw-quadrant-body" style="min-height:120px;">
                                        ${Array.from({length: 3}, () => `<div class="sk-line" style="width:${65 + Math.floor(Math.random()*30)}%;margin-bottom:8px;"></div>`).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // =====================================================
    // IMPACT DEFINITION - Espelha: page-gio > page-actions-gio + id-grids (2x2 grid de card-gio com table-gio)
    // =====================================================
    impactDefinition() {
        this.ensureStyles();
        const gridColors = [
            { accent: '#10b981', label: 'Alavancas' },
            { accent: '#3b82f6', label: 'Defesas' },
            { accent: '#f59e0b', label: 'Restrições' },
            { accent: '#ef4444', label: 'Problemas' }
        ];

        return `
            <div class="page-gio">
                <div class="page-actions-gio">
                    <div class="sk-line" style="width:120px;height:38px;border-radius:10px;"></div>
                </div>
                <div class="id-grids">
                    ${gridColors.map(g => `
                        <div class="card-gio sk-pulse" style="overflow:visible;border-left:4px solid ${g.accent};">
                            <div style="padding:14px 20px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;">
                                <div class="sk-line" style="width:120px;height:15px;"></div>
                                <div class="sk-line" style="width:100px;height:11px;"></div>
                            </div>
                            <div style="padding:12px;">
                                <table class="table-gio" style="font-size:12px;">
                                    <thead>
                                        <tr>
                                            <th style="text-align:left;"><div class="sk-line" style="width:60px;height:12px;"></div></th>
                                            ${Array.from({length: 3}, () => `<th><div class="sk-line" style="width:50px;height:12px;margin:0 auto;"></div></th>`).join('')}
                                            <th><div class="sk-line" style="width:40px;height:12px;margin:0 auto;"></div></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Array.from({length: 3}, () => `
                                            <tr class="sk-pulse">
                                                <td style="text-align:left;"><div class="sk-line" style="width:80%;"></div></td>
                                                ${Array.from({length: 3}, () => `<td style="padding:4px;text-align:center;"><div class="sk-line" style="width:44px;height:30px;border-radius:6px;margin:0 auto;"></div></td>`).join('')}
                                                <td style="text-align:center;"><div class="sk-line" style="width:30px;margin:0 auto;"></div></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    // =====================================================
    // SCENARIO ANALYSIS - Espelha: page-gio > 2x card-gio com table-gio (Oportunidades/Ameaças) + card-gio resumo
    // =====================================================
    scenarioAnalysis() {
        this.ensureStyles();
        const sections = [
            { title: 'Oportunidades', color: '#3b82f6' },
            { title: 'Ameaças', color: '#f59e0b' }
        ];

        return `
            <div class="page-gio">
                ${sections.map(s => `
                    <div class="card-gio sk-pulse" style="margin-bottom:16px;border-left:4px solid ${s.color};">
                        <div style="padding:16px 20px;border-bottom:1px solid var(--border-light);">
                            <span style="font-size:16px;font-weight:700;color:${s.color};">${s.title}</span>
                        </div>
                        <div class="table-gio-container">
                            <table class="table-gio">
                                <thead>
                                    <tr>
                                        <th style="width:40px;">#</th>
                                        <th style="text-align:left;">Descrição</th>
                                        <th>Fraqueza</th>
                                        <th>Força</th>
                                        <th>Total</th>
                                        <th style="min-width:130px;">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Array.from({length: 3}, (_, i) => `
                                        <tr class="sk-pulse">
                                            <td style="color:var(--text-muted);font-weight:700;">${i + 1}</td>
                                            <td style="text-align:left;"><div class="sk-line" style="width:85%;"></div></td>
                                            <td><div class="sk-line" style="width:30px;margin:0 auto;"></div></td>
                                            <td><div class="sk-line" style="width:30px;margin:0 auto;"></div></td>
                                            <td><div class="sk-line" style="width:30px;margin:0 auto;"></div></td>
                                            <td><div class="sk-line" style="width:90%;height:6px;border-radius:3px;"></div></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('')}
                <div class="card-gio sk-pulse">
                    <div style="padding:20px 24px;">
                        <div class="sk-line" style="width:180px;height:16px;margin-bottom:14px;"></div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
                            <div style="border-radius:var(--radius-lg,16px);padding:16px;border-left:4px solid #3b82f6;background:var(--info-bg,#f0f9ff);">
                                <div class="sk-line" style="width:120px;height:10px;margin-bottom:8px;"></div>
                                <div class="sk-line" style="width:80%;height:14px;margin-bottom:4px;"></div>
                                <div class="sk-line" style="width:50%;height:10px;"></div>
                            </div>
                            <div style="border-radius:var(--radius-lg,16px);padding:16px;border-left:4px solid #f59e0b;background:var(--warning-bg,#fffbeb);">
                                <div class="sk-line" style="width:100px;height:10px;margin-bottom:8px;"></div>
                                <div class="sk-line" style="width:80%;height:14px;margin-bottom:4px;"></div>
                                <div class="sk-line" style="width:50%;height:10px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
};

export { SkeletonLoader };
window.SkeletonLoader = SkeletonLoader;
