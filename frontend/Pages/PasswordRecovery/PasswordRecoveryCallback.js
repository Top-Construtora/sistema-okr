// Página de Callback - Captura o Token do Supabase
const PasswordRecoveryCallbackPage = {
    async render() {
        const content = document.getElementById('content');
        if (!content) {
            document.body.innerHTML = this.getLoadingHTML();
        } else {
            content.innerHTML = this.getLoadingHTML();
        }

        this.addStyles();
        await this.handleCallback();
    },

    async handleCallback() {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Tentar pegar access_token
        let accessToken = params.get('access_token') || queryParams.get('access_token');

        // Verificar se há erro
        const error = params.get('error') || queryParams.get('error');
        const errorCode = params.get('error_code') || queryParams.get('error_code');

        if (error === 'access_denied' && errorCode === 'otp_expired') {
            this.showError('Link expirado. Redirecionando...');
            setTimeout(() => {
                window.location.href = '/esqueci-senha';
            }, 2000);
            return;
        }

        if (error) {
            this.showError('Erro ao processar link. Redirecionando...');
            setTimeout(() => {
                window.location.href = '/esqueci-senha';
            }, 2000);
            return;
        }

        if (accessToken) {
            window.location.href = `/redefinir-senha#access_token=${accessToken}&type=recovery`;
        } else {
            this.showError('Link inválido. Redirecionando...');
            setTimeout(() => {
                window.location.href = '/esqueci-senha';
            }, 2000);
        }
    },

    showError(message) {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="callback-container">
                    <div class="callback-card">
                        <div class="error-icon">⚠️</div>
                        <h2>Atenção</h2>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
    },

    getLoadingHTML() {
        return `
            <div class="callback-container">
                <div class="callback-card">
                    <div class="loading-spinner"></div>
                    <h2>Processando...</h2>
                    <p>Aguarde enquanto validamos seu link de recuperação.</p>
                </div>
            </div>
        `;
    },

    addStyles() {
        if (document.getElementById('callback-styles')) return;

        const style = document.createElement('style');
        style.id = 'callback-styles';
        style.textContent = `
            .callback-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #1e2938 0%, #1e6076 50%, #12b0a0 100%);
                padding: 20px;
            }

            .callback-card {
                background: white;
                border-radius: 16px;
                padding: 48px 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
                max-width: 400px;
                width: 100%;
            }

            .callback-card h2 {
                font-size: 24px;
                font-weight: 700;
                color: #1a202c;
                margin: 0 0 12px 0;
            }

            .callback-card p {
                font-size: 14px;
                color: #718096;
                margin: 0;
                line-height: 1.6;
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid #e2e8f0;
                border-top: 4px solid #12b0a0;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 24px;
            }

            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
};

export default PasswordRecoveryCallbackPage;
