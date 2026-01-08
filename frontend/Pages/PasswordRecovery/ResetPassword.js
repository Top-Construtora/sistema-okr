// Página de Redefinição de Senha
const ResetPasswordPage = {
    token: null,
    errorType: null,
    errorMessage: null,
    session: null,

    async render() {
        // Primeiro, tentar obter a sessão do Supabase
        await this.checkSupabaseSession();

        // Se não conseguir sessão, tentar extrair token da URL
        if (!this.session) {
            this.extractToken();
        }

        const content = document.getElementById('content');
        if (!content) {
            document.body.innerHTML = this.getHTML();
        } else {
            content.innerHTML = this.getHTML();
        }

        this.addStyles();
        this.attachEventListeners();

        // Se não houver token nem sessão, mostrar erro
        if (!this.token && !this.session) {
            let errorMsg = 'Link de recuperação inválido. Solicite um novo link.';

            if (this.errorType === 'expired') {
                errorMsg = '⏰ Este link de recuperação expirou. Por favor, solicite um novo link clicando no botão abaixo.';
            } else if (this.errorMessage) {
                errorMsg = this.errorMessage;
            }

            this.showError(errorMsg);
            const form = document.getElementById('resetPasswordForm');
            if (form) {
                form.style.display = 'none';
            }

            // Mudar o texto do botão "Voltar ao login" para "Solicitar novo link"
            const backLink = document.getElementById('backToLoginLink');
            if (backLink && this.errorType === 'expired') {
                backLink.textContent = 'Solicitar Novo Link';
                backLink.href = '/esqueci-senha';
            }
        }
    },

    async checkSupabaseSession() {
        try {
            const { supabaseClient } = await import('../../services/supabase.js');
            const { data: { session }, error } = await supabaseClient.auth.getSession();

            if (!error && session) {
                this.session = session;
                this.token = session.access_token;
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
        }
    },

    extractToken() {
        const hash = window.location.hash;
        if (hash) {
            const params = new URLSearchParams(hash.substring(1));

            // Verificar se há erro de expiração
            const error = params.get('error');
            const errorCode = params.get('error_code');
            const errorDescription = params.get('error_description');

            if (error === 'access_denied' && errorCode === 'otp_expired') {
                this.errorType = 'expired';
                return;
            }

            if (error) {
                this.errorType = 'generic';
                this.errorMessage = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : 'Erro desconhecido';
                return;
            }

            this.token = params.get('access_token');
        }

        // Se não encontrar no hash, tentar na query string
        if (!this.token) {
            const params = new URLSearchParams(window.location.search);
            this.token = params.get('token') || params.get('access_token');
        }

        // Tentar extração manual como fallback
        if (!this.token) {
            const fullUrl = window.location.href;
            const match = fullUrl.match(/access_token=([^&]+)/);
            if (match) {
                this.token = match[1];
            }
        }
    },

    getHTML() {
        return `
            <div class="reset-password-container">
                <div class="reset-password-bg">
                    <div class="bg-gradient"></div>
                </div>

                <div class="reset-password-content">
                    <div class="reset-password-card">
                        <div class="reset-password-header">
                            <h1>Redefinir Senha</h1>
                            <p>Digite sua nova senha</p>
                        </div>

                        <form id="resetPasswordForm" class="reset-password-form">
                            <div class="form-group">
                                <label for="new-password">Nova Senha</label>
                                <div class="password-input-wrapper">
                                    <input
                                        type="password"
                                        id="new-password"
                                        class="form-control"
                                        placeholder="••••••••"
                                        required
                                        autocomplete="new-password"
                                        minlength="6"
                                    >
                                    <button type="button" class="password-toggle" id="toggleNewPassword">
                                        <svg id="eyeIconNew" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </button>
                                </div>
                                <small class="form-hint">Mínimo de 6 caracteres</small>
                            </div>

                            <div class="form-group">
                                <label for="confirm-password">Confirmar Nova Senha</label>
                                <div class="password-input-wrapper">
                                    <input
                                        type="password"
                                        id="confirm-password"
                                        class="form-control"
                                        placeholder="••••••••"
                                        required
                                        autocomplete="new-password"
                                        minlength="6"
                                    >
                                    <button type="button" class="password-toggle" id="toggleConfirmPassword">
                                        <svg id="eyeIconConfirm" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div id="resetError" class="error-message" style="display:none;"></div>
                            <div id="resetSuccess" class="success-message" style="display:none;"></div>

                            <button type="submit" class="btn btn-primary btn-block btn-reset">
                                <span class="btn-text">Redefinir Senha</span>
                                <span class="btn-loading" style="display:none;">
                                    <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
                                    </svg>
                                    Redefinindo...
                                </span>
                            </button>
                        </form>

                        <div class="back-to-login">
                            <a href="#" id="backToLoginLink">Voltar ao login</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        const form = document.getElementById('resetPasswordForm');
        const backLink = document.getElementById('backToLoginLink');
        const toggleNewBtn = document.getElementById('toggleNewPassword');
        const toggleConfirmBtn = document.getElementById('toggleConfirmPassword');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/';
            });
        }

        if (toggleNewBtn) {
            toggleNewBtn.addEventListener('click', () => {
                this.togglePasswordVisibility('new-password', 'eyeIconNew');
            });
        }

        if (toggleConfirmBtn) {
            toggleConfirmBtn.addEventListener('click', () => {
                this.togglePasswordVisibility('confirm-password', 'eyeIconConfirm');
            });
        }
    },

    togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (input.type === 'password') {
            input.type = 'text';
            icon.style.opacity = '0.6';
        } else {
            input.type = 'password';
            icon.style.opacity = '1';
        }
    },

    showError(message) {
        const errorDiv = document.getElementById('resetError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    },

    showSuccess(message) {
        const successDiv = document.getElementById('resetSuccess');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
    },

    async handleSubmit() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('resetError');
        const successDiv = document.getElementById('resetSuccess');
        const submitBtn = document.querySelector('.btn-reset');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        // Limpar mensagens anteriores
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        // Validações
        if (!newPassword || !confirmPassword) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('As senhas não coincidem');
            return;
        }

        // Estado de loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';

        try {
            // Se temos uma sessão do Supabase, usar o método nativo
            if (this.session) {
                const { supabaseClient } = await import('../../services/supabase.js');

                const { error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    this.showError(error.message || 'Erro ao redefinir senha');
                    submitBtn.disabled = false;
                    btnText.style.display = 'block';
                    btnLoading.style.display = 'none';
                    return;
                }

                this.showSuccess('Senha redefinida com sucesso! Redirecionando...');

                // Fazer logout da sessão de recuperação
                await supabaseClient.auth.signOut();

                // Redirecionar para login após 2 segundos
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } else {
                // Usar o método via backend (fallback)
                const result = await AuthService.resetPassword(this.token, newPassword);

                if (result.success) {
                    this.showSuccess(result.message || 'Senha redefinida com sucesso! Redirecionando...');

                    // Redirecionar para login após 2 segundos
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    this.showError(result.error || 'Erro ao redefinir senha');
                    submitBtn.disabled = false;
                    btnText.style.display = 'block';
                    btnLoading.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            this.showError('Erro ao processar solicitação. Tente novamente.');
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    },

    addStyles() {
        if (document.getElementById('reset-password-styles')) return;

        const style = document.createElement('style');
        style.id = 'reset-password-styles';
        style.textContent = `
            .reset-password-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }

            .reset-password-bg {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 0;
            }

            .bg-gradient {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1e2938 0%, #1e6076 50%, #12b0a0 100%);
                opacity: 0.95;
            }

            .reset-password-content {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 450px;
                padding: 20px;
            }

            .reset-password-card {
                background: white;
                border-radius: 16px;
                padding: 48px 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .reset-password-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .reset-password-header h1 {
                font-size: 28px;
                font-weight: 700;
                color: #1a202c;
                margin: 0 0 12px 0;
            }

            .reset-password-header p {
                font-size: 14px;
                color: #718096;
                margin: 0;
            }

            .reset-password-form .form-group {
                margin-bottom: 20px;
            }

            .reset-password-form label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 8px;
            }

            .password-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }

            .password-input-wrapper .form-control {
                flex: 1;
                padding-right: 48px;
            }

            .password-toggle {
                position: absolute;
                right: 12px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #718096;
                transition: color 0.2s;
            }

            .password-toggle:hover {
                color: #2d3748;
            }

            .reset-password-form .form-control {
                width: 100%;
                padding: 12px 16px;
                font-size: 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .reset-password-form .form-control:focus {
                outline: none;
                border-color: #12b0a0;
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.1);
            }

            .form-hint {
                display: block;
                font-size: 12px;
                color: #718096;
                margin-top: 6px;
            }

            .btn-reset {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 24px;
            }

            .btn-reset:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(18, 176, 160, 0.4);
            }

            .btn-reset:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .btn-reset .btn-loading {
                display: none;
                align-items: center;
                gap: 8px;
            }

            .spinner {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .back-to-login {
                text-align: center;
                margin-top: 24px;
            }

            .back-to-login a {
                color: #12b0a0;
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                transition: color 0.2s;
            }

            .back-to-login a:hover {
                color: #0d9488;
                text-decoration: underline;
            }

            .error-message {
                background-color: #fed7d7;
                color: #c53030;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                margin-bottom: 16px;
                border-left: 4px solid #c53030;
            }

            .success-message {
                background-color: #c6f6d5;
                color: #22543d;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                margin-bottom: 16px;
                border-left: 4px solid #22543d;
            }

            @media (max-width: 500px) {
                .reset-password-card {
                    padding: 32px 24px;
                }

                .reset-password-header h1 {
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

export default ResetPasswordPage;
