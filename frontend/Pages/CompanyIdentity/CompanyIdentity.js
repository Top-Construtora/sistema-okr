import { AuthService } from '../../services/auth.js';
import { SystemSetting } from '../../Entities/SystemSetting.js';

const IDENTITY_KEYS = ['company_mission', 'company_vision', 'company_values'];

const IDENTITY_CONFIG = {
    company_mission: {
        label: 'Missão',
        placeholder: 'Descreva o propósito central da empresa — por que ela existe e o que busca realizar...',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>
        </svg>`,
        color: '#e85d2f',
        bg: 'rgba(232, 93, 47, 0.08)',
    },
    company_vision: {
        label: 'Visão',
        placeholder: 'Descreva onde a empresa quer chegar no futuro — o estado ideal a ser alcançado...',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>`,
        color: '#1e6076',
        bg: 'rgba(30, 96, 118, 0.08)',
    },
    company_values: {
        label: 'Valores',
        placeholder: 'Liste os princípios e crenças que guiam o comportamento e as decisões da empresa...',
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>`,
        color: '#12b0a0',
        bg: 'rgba(18, 176, 160, 0.08)',
    },
};

const CompanyIdentityPage = {
    data: {},
    editing: false,

    async render() {
        const content = document.getElementById('content');
        const isAdmin = AuthService.isAdmin();

        content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;">
            <div style="width:40px;height:40px;border:3px solid #12b0a0;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>`;

        const settings = await SystemSetting.getByCategory('identity');
        this.data = {};
        settings.forEach(s => {
            // value stored as JSON string — unwrap if needed
            let val = s.value;
            if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                try { val = JSON.parse(val); } catch (_) {}
            }
            this.data[s.key] = val || '';
        });

        this.editing = false;
        this._renderContent(content, isAdmin);
        this._addStyles();
    },

    _renderContent(content, isAdmin) {
        const hasAnyContent = IDENTITY_KEYS.some(k => this.data[k]);

        content.innerHTML = `
            <div class="ci-page">
                ${isAdmin ? `
                <div class="ci-actions">
                    ${this.editing ? `
                        <button class="ci-btn-secondary" onclick="CompanyIdentityPage.cancelEdit()">Cancelar</button>
                        <button class="ci-btn-primary" id="ci-save-btn" onclick="CompanyIdentityPage.save()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Salvar
                        </button>
                    ` : `
                        <button class="ci-btn-primary" onclick="CompanyIdentityPage.startEdit()">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Editar
                        </button>
                    `}
                </div>
                ` : ''}

                <div class="ci-cards">
                    ${IDENTITY_KEYS.map(key => this._renderCard(key)).join('')}
                </div>

                ${!hasAnyContent && !this.editing && !isAdmin ? `
                <div class="ci-empty">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <p>A identidade organizacional ainda não foi preenchida.</p>
                </div>
                ` : ''}
            </div>
        `;
    },

    _renderCard(key) {
        const cfg = IDENTITY_CONFIG[key];
        const value = this.data[key] || '';

        return `
            <div class="ci-card" style="--ci-color:${cfg.color};--ci-bg:${cfg.bg};">
                <div class="ci-card-header">
                    <div class="ci-card-icon">${cfg.icon}</div>
                    <h3 class="ci-card-title">${cfg.label}</h3>
                </div>
                <div class="ci-card-body">
                    ${this.editing ? `
                        <textarea id="ci-input-${key}" class="ci-textarea"
                            placeholder="${cfg.placeholder}"
                            rows="6">${this._escapeHtml(value)}</textarea>
                    ` : value ? `
                        <p class="ci-card-text">${this._escapeHtml(value)}</p>
                    ` : `
                        <p class="ci-card-empty">${cfg.placeholder.split('—')[0].trim()}...</p>
                    `}
                </div>
            </div>
        `;
    },

    startEdit() {
        this.editing = true;
        const isAdmin = AuthService.isAdmin();
        this._renderContent(document.getElementById('content'), isAdmin);
        // Focus first textarea
        setTimeout(() => {
            const first = document.getElementById(`ci-input-${IDENTITY_KEYS[0]}`);
            if (first) first.focus();
        }, 50);
    },

    cancelEdit() {
        this.editing = false;
        const isAdmin = AuthService.isAdmin();
        this._renderContent(document.getElementById('content'), isAdmin);
    },

    async save() {
        const btn = document.getElementById('ci-save-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        try {
            const updates = IDENTITY_KEYS.map(key => {
                const el = document.getElementById(`ci-input-${key}`);
                const value = el ? el.value.trim() : (this.data[key] || '');
                this.data[key] = value;
                return { key, value, data_type: 'string' };
            });

            await SystemSetting.updateMultiple(updates);

            this.editing = false;
            const isAdmin = AuthService.isAdmin();
            this._renderContent(document.getElementById('content'), isAdmin);
            DepartmentsPage.showToast('Identidade organizacional salva com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao salvar identidade:', err);
            DepartmentsPage.showToast('Erro ao salvar. Tente novamente.', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
        }
    },

    _escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    _addStyles() {
        if (document.getElementById('ci-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'ci-page-styles';
        style.textContent = `
            @keyframes spin { to { transform: rotate(360deg); } }

            .ci-page {
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }

            .ci-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-bottom: 20px;
            }

            .ci-btn-primary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .ci-btn-primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(18, 176, 160, 0.4);
            }

            .ci-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .ci-btn-primary svg {
                width: 16px;
                height: 16px;
            }

            .ci-btn-secondary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: white;
                color: #64748b;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ci-btn-secondary:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                color: #1f2937;
            }

            .ci-cards {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }

            @media (max-width: 1024px) {
                .ci-cards { grid-template-columns: 1fr; }
            }

            .ci-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                overflow: hidden;
                border-top: 4px solid var(--ci-color);
                display: flex;
                flex-direction: column;
            }

            .ci-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px 20px 16px;
                border-bottom: 1px solid #f1f5f9;
            }

            .ci-card-icon {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: var(--ci-bg);
                color: var(--ci-color);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .ci-card-icon svg {
                width: 22px;
                height: 22px;
            }

            .ci-card-title {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
            }

            .ci-card-body {
                padding: 20px;
                flex: 1;
            }

            .ci-card-text {
                font-size: 14px;
                color: #374151;
                line-height: 1.75;
                margin: 0;
                white-space: pre-wrap;
            }

            .ci-card-empty {
                font-size: 13px;
                color: #94a3b8;
                font-style: italic;
                margin: 0;
                line-height: 1.6;
            }

            .ci-textarea {
                width: 100%;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px 14px;
                font-size: 14px;
                color: #1f2937;
                line-height: 1.7;
                font-family: inherit;
                resize: vertical;
                min-height: 140px;
                box-sizing: border-box;
                transition: border-color 0.15s;
                outline: none;
            }

            .ci-textarea:focus {
                border-color: #12b0a0;
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.12);
            }

            .ci-empty {
                text-align: center;
                padding: 60px 20px;
                color: #94a3b8;
            }

            .ci-empty svg {
                color: #cbd5e1;
                margin-bottom: 12px;
            }

            .ci-empty p {
                font-size: 14px;
                margin: 0;
            }

            @media (max-width: 768px) {
                .ci-page {
                    margin: -16px;
                    padding: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

export { CompanyIdentityPage };
window.CompanyIdentityPage = CompanyIdentityPage;
