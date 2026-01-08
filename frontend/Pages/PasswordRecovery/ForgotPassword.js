// Página de Recuperação de Senha (Esqueci Minha Senha)
const ForgotPasswordPage = {
    async render() {
        const content = document.getElementById('content');
        if (!content) {
            document.body.innerHTML = this.getHTML();
        } else {
            content.innerHTML = this.getHTML();
        }

        this.addStyles();
        this.attachEventListeners();
    },

    getHTML() {
        return `
            <div class="forgot-password-container">
                <div class="forgot-password-bg">
                    <div class="bg-gradient"></div>
                </div>

                <div class="forgot-password-content">
                    <div class="forgot-password-card">
                        <div class="forgot-password-header">
                            <h1>Recuperar Senha</h1>
                            <p>Digite seu email para receber o link de recuperação</p>
                        </div>

                        <form id="forgotPasswordForm" class="forgot-password-form">
                            <div class="form-group">
                                <label for="forgot-email">Email</label>
                                <input
                                    type="email"
                                    id="forgot-email"
                                    class="form-control"
                                    placeholder="seu@email.com"
                                    required
                                    autocomplete="email"
                                >
                            </div>

                            <div id="forgotError" class="error-message" style="display:none;"></div>
                            <div id="forgotSuccess" class="success-message" style="display:none;"></div>

                            <button type="submit" class="btn btn-primary btn-block btn-forgot">
                                <span class="btn-text">Enviar Link de Recuperação</span>
                                <span class="btn-loading" style="display:none;">
                                    <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
                                    </svg>
                                    Enviando...
                                </span>
                            </button>

                            <div class="back-to-login">
                                <a href="#" id="backToLoginLink">Voltar ao login</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        const form = document.getElementById('forgotPasswordForm');
        const backLink = document.getElementById('backToLoginLink');

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
    },

    async handleSubmit() {
        const email = document.getElementById('forgot-email').value;
        const errorDiv = document.getElementById('forgotError');
        const successDiv = document.getElementById('forgotSuccess');
        const submitBtn = document.querySelector('.btn-forgot');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        // Limpar mensagens anteriores
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        // Validação básica
        if (!email) {
            errorDiv.textContent = 'Por favor, digite seu email';
            errorDiv.style.display = 'block';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = 'Por favor, digite um email válido';
            errorDiv.style.display = 'block';
            return;
        }

        // Estado de loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';

        try {
            // Chamar o AuthService
            const result = await AuthService.requestPasswordReset(email);

            if (result.success) {
                successDiv.textContent = result.message || 'Se o email estiver cadastrado, você receberá um link de recuperação em breve.';
                successDiv.style.display = 'block';

                // Limpar o formulário
                document.getElementById('forgot-email').value = '';
            } else {
                errorDiv.textContent = result.error || 'Erro ao enviar email de recuperação';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao solicitar recuperação:', error);
            errorDiv.textContent = 'Erro ao processar solicitação. Tente novamente.';
            errorDiv.style.display = 'block';
        } finally {
            // Restaurar botão
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    },

    addStyles() {
        if (document.getElementById('forgot-password-styles')) return;

        const style = document.createElement('style');
        style.id = 'forgot-password-styles';
        style.textContent = `
            .forgot-password-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }

            .forgot-password-bg {
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

            .forgot-password-content {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 450px;
                padding: 20px;
            }

            .forgot-password-card {
                background: white;
                border-radius: 16px;
                padding: 48px 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .forgot-password-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .forgot-password-header h1 {
                font-size: 28px;
                font-weight: 700;
                color: #1a202c;
                margin: 0 0 12px 0;
            }

            .forgot-password-header p {
                font-size: 14px;
                color: #718096;
                margin: 0;
            }

            .forgot-password-form .form-group {
                margin-bottom: 24px;
            }

            .forgot-password-form label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 8px;
            }

            .forgot-password-form .form-control {
                width: 100%;
                padding: 12px 16px;
                font-size: 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .forgot-password-form .form-control:focus {
                outline: none;
                border-color: #12b0a0;
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.1);
            }

            .btn-forgot {
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
            }

            .btn-forgot:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(18, 176, 160, 0.4);
            }

            .btn-forgot:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .btn-forgot .btn-loading {
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
                .forgot-password-card {
                    padding: 32px 24px;
                }

                .forgot-password-header h1 {
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

export default ForgotPasswordPage;
