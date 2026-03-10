import { AuthService } from '../../services/auth.js';

const KPIsPage = {
    async render() {
        const content = document.getElementById('content');
        const isAdmin = AuthService.isAdmin();

        if (!isAdmin) {
            content.innerHTML = '<p>Acesso negado.</p>';
            return;
        }

        content.innerHTML = `
            <div class="page-gio">
                <div class="card-gio">
                    <div class="empty-state-gio">
                        <div class="empty-state-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                        </div>
                        <h3>KPI's</h3>
                        <p>Em breve você poderá gerenciar os indicadores de performance aqui</p>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    },

    addStyles() {
        if (document.getElementById('kpi-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'kpi-page-styles';
        style.textContent = `
            .page-gio {
                background: #f5f9ff;
                margin: -24px;
                padding: 24px;
                min-height: calc(100vh - 140px);
            }
            .card-gio {
                background: white;
                border-radius: 16px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                overflow: hidden;
            }
            .empty-state-gio {
                text-align: center;
                padding: 60px 20px;
            }
            .empty-state-icon {
                width: 72px;
                height: 72px;
                border-radius: 20px;
                background: rgba(18, 176, 160, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            }
            .empty-state-icon svg {
                width: 36px;
                height: 36px;
                color: #12b0a0;
            }
            .empty-state-gio h3 {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
            }
            .empty-state-gio p {
                font-size: 14px;
                color: #64748b;
                margin: 0 0 24px 0;
            }
        `;
        document.head.appendChild(style);
    }
};

export { KPIsPage };
window.KPIsPage = KPIsPage;
