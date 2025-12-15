// App Principal
import { StorageService } from './services/storage.js';
import { AuthService } from './services/auth.js';
import { User } from './Entities/User.js';

const App = {
    async init() {
        // Mostra loading
        document.getElementById('app').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#1e6076;"><div style="text-align:center;"><div style="font-size:48px;margin-bottom:16px;">TOP</div><div>Carregando sistema...</div></div></div>';

        try {
            // Inicializa o storage (testa conexão Supabase)
            const connected = await StorageService.init();

            if (!connected) {
                this.showError('Erro ao conectar com o banco de dados. Verifique sua configuração do Supabase.');
                return;
            }

            // Cria admin padrão se necessário
            await AuthService.initializeDefaultAdmin();

            // Verifica se está autenticado
            if (AuthService.isAuthenticated()) {
                this.renderApp();
            } else {
                this.renderLogin();
            }
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showError('Erro ao inicializar o sistema: ' + error.message);
        }
    },

    showError(message) {
        document.getElementById('app').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
                <div style="text-align:center;max-width:500px;padding:40px;">
                    <div style="font-size:48px;color:#ef4444;margin-bottom:16px;">⚠️</div>
                    <h2 style="color:#1e6076;margin-bottom:12px;">Erro de Configuração</h2>
                    <p style="color:#475569;margin-bottom:24px;">${message}</p>
                    <div style="background:#fef3c7;border:1px solid #f59e0b;padding:16px;border-radius:8px;text-align:left;font-size:13px;">
                        <strong>Verifique:</strong>
                        <ol style="margin:8px 0 0 20px;">
                            <li>Arquivo <code>services/supabase.js</code> está configurado</li>
                            <li>SUPABASE_URL e SUPABASE_ANON_KEY estão corretos</li>
                            <li>Scripts SQL foram executados no Supabase</li>
                            <li>Console do navegador (F12) para mais detalhes</li>
                        </ol>
                    </div>
                    <button onclick="location.reload()" style="margin-top:24px;padding:12px 24px;background:#12b0a0;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    },

    renderApp() {
        Layout.render();
    },

    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container">
                <!-- Background Pattern -->
                <div class="login-bg-pattern"></div>

                <div class="login-content">
                    <!-- Left Side - Branding & Info -->
                    <div class="login-branding">
                        <div class="login-branding-content">
                            <img src="/gio.png" alt="Logo GIO" class="login-logo">
                            <div class="login-title-block">
                                <h1 class="login-main-title">
                                    Sistema de<br>
                                    <span class="highlight">Gestão OKR</span>
                                </h1>
                                <p class="login-subtitle">
                                    Gerencie objetivos e resultados-chave, acompanhe o progresso
                                    das metas e mantenha sua equipe alinhada com os objetivos estratégicos.
                                </p>
                            </div>

                            <!-- Features -->
                            <div class="login-features">
                                <div class="login-feature-item">
                                    <div class="login-feature-icon" style="background: #12b0a0;">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3>Objetivos Estratégicos</h3>
                                        <p>Defina e acompanhe metas da organização</p>
                                    </div>
                                </div>

                                <div class="login-feature-item">
                                    <div class="login-feature-icon" style="background: #1e6076;">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3>Resultados-Chave</h3>
                                        <p>Meça o progresso com indicadores claros</p>
                                    </div>
                                </div>

                                <div class="login-feature-item">
                                    <div class="login-feature-icon" style="background: #baa673;">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3>Gestão de Equipes</h3>
                                        <p>Acompanhe OKRs por departamento</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Side - Login Form -->
                    <div class="login-form-wrapper">
                        <div class="login-card">
                            <div class="login-card-header">
                                <div class="login-mobile-logo">
                                    <img src="/gio.png" alt="Logo GIO">
                                </div>
                                <h2>Bem-vindo(a)!</h2>
                                <p>Faça login para acessar o sistema OKR</p>
                            </div>

                            <form id="loginForm" class="login-form">
                                <div class="form-group">
                                    <label for="email">Email</label>
                                    <input type="email" id="email" class="form-control" placeholder="seu@email.com" required autocomplete="username">
                                </div>
                                <div class="form-group">
                                    <label for="senha">Senha</label>
                                    <div class="password-input-wrapper">
                                        <input type="password" id="senha" class="form-control" placeholder="••••••••" required autocomplete="current-password">
                                        <button type="button" class="password-toggle" onclick="App.togglePassword()">
                                            <svg id="eyeIcon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div id="loginError" class="error-message" style="display:none;"></div>
                                <button type="submit" class="btn btn-primary btn-block btn-login">
                                    <span class="btn-text">Entrar no Sistema</span>
                                    <span class="btn-loading" style="display:none;">
                                        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
                                        </svg>
                                        Entrando...
                                    </span>
                                </button>
                            </form>

                            <div class="login-card-footer">
                                <p>Sistema protegido por autenticação segura</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adiciona estilos de login
        this.addLoginStyles();

        // Event listener do form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    },

    togglePassword() {
        const senhaInput = document.getElementById('senha');
        const eyeIcon = document.getElementById('eyeIcon');

        if (senhaInput.type === 'password') {
            senhaInput.type = 'text';
            eyeIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            `;
        } else {
            senhaInput.type = 'password';
            eyeIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            `;
        }
    },

    async handleLogin() {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        // Desabilita botão e mostra loading
        submitBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'flex';

        try {
            const user = await AuthService.login(email, senha);
            if (user) {
                // Verifica se é o primeiro acesso
                if (user.primeiro_acesso) {
                    this.showChangePasswordModal(user);
                } else {
                    this.renderApp();
                }
            } else {
                errorDiv.textContent = 'Email ou senha inválidos';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro ao fazer login: ' + error.message;
            errorDiv.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    },

    // Modal para troca de senha no primeiro acesso
    showChangePasswordModal(user) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container">
                <div class="login-card" style="max-width:480px;">
                    <div class="login-header">
                        <div class="brand-icon" style="background:#f59e0b;">
                            <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                        </div>
                        <h1>Primeiro Acesso</h1>
                        <p>Olá, <strong>${user.nome}</strong>! Por segurança, você precisa criar uma nova senha.</p>
                    </div>
                    <form id="changePasswordForm" class="login-form">
                        <div class="form-group">
                            <label>Nova Senha</label>
                            <input type="password" id="newPassword" class="form-control"
                                placeholder="Mínimo 6 caracteres" required autocomplete="new-password">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Nova Senha</label>
                            <input type="password" id="confirmPassword" class="form-control"
                                placeholder="Digite novamente" required autocomplete="new-password">
                        </div>
                        <div class="password-requirements">
                            <p><strong>Requisitos da senha:</strong></p>
                            <ul>
                                <li id="req-length" class="requirement">Mínimo de 6 caracteres</li>
                                <li id="req-match" class="requirement">As senhas devem ser iguais</li>
                            </ul>
                        </div>
                        <div id="changePasswordError" class="error-message" style="display:none;"></div>
                        <button type="submit" class="btn btn-primary btn-block" id="changePasswordBtn">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:8px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Salvar Nova Senha
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.addLoginStyles();
        this.addChangePasswordStyles();

        // Validação em tempo real
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const reqLength = document.getElementById('req-length');
        const reqMatch = document.getElementById('req-match');

        const validatePassword = () => {
            const pass = newPassword.value;
            const confirm = confirmPassword.value;

            // Validar tamanho
            if (pass.length >= 6) {
                reqLength.classList.add('valid');
                reqLength.classList.remove('invalid');
            } else if (pass.length > 0) {
                reqLength.classList.add('invalid');
                reqLength.classList.remove('valid');
            } else {
                reqLength.classList.remove('valid', 'invalid');
            }

            // Validar match
            if (confirm.length > 0 && pass === confirm) {
                reqMatch.classList.add('valid');
                reqMatch.classList.remove('invalid');
            } else if (confirm.length > 0) {
                reqMatch.classList.add('invalid');
                reqMatch.classList.remove('valid');
            } else {
                reqMatch.classList.remove('valid', 'invalid');
            }
        };

        newPassword.addEventListener('input', validatePassword);
        confirmPassword.addEventListener('input', validatePassword);

        // Submit do form
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleChangePassword(user);
        });
    },

    async handleChangePassword(user) {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('changePasswordError');
        const submitBtn = document.getElementById('changePasswordBtn');

        errorDiv.style.display = 'none';

        // Validações
        if (newPassword.length < 6) {
            errorDiv.textContent = 'A senha deve ter no mínimo 6 caracteres';
            errorDiv.style.display = 'block';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'As senhas não conferem';
            errorDiv.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" style="margin-right:8px;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
            </svg>
            Salvando...
        `;

        try {
            await User.updatePassword(user.id, newPassword);

            // Atualiza o usuário na sessão
            user.primeiro_acesso = false;
            StorageService.setCurrentUser(user);

            // Mostra mensagem de sucesso e redireciona
            this.showSuccessMessage();
        } catch (error) {
            errorDiv.textContent = error.message || 'Erro ao alterar senha';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:8px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Salvar Nova Senha
            `;
        }
    },

    showSuccessMessage() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container">
                <div class="login-card" style="text-align:center;">
                    <div style="width:80px;height:80px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
                        <svg width="40" height="40" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h2 style="color:var(--top-blue);margin-bottom:8px;">Senha Alterada!</h2>
                    <p style="color:var(--text-muted);margin-bottom:24px;">Sua nova senha foi salva com sucesso.</p>
                    <div class="loading-dots" style="margin-bottom:16px;">
                        <span></span><span></span><span></span>
                    </div>
                    <p style="color:var(--text-muted);font-size:13px;">Entrando no sistema...</p>
                </div>
            </div>
        `;

        this.addLoginStyles();

        // Redireciona após 2 segundos
        setTimeout(() => {
            this.renderApp();
        }, 2000);
    },

    addChangePasswordStyles() {
        if (document.getElementById('change-password-styles')) return;

        const style = document.createElement('style');
        style.id = 'change-password-styles';
        style.textContent = `
            .password-requirements {
                background: #f8fafc;
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
            }

            .password-requirements p {
                margin: 0 0 8px 0;
                font-size: 13px;
                color: var(--text-secondary);
            }

            .password-requirements ul {
                margin: 0;
                padding-left: 20px;
            }

            .requirement {
                font-size: 13px;
                color: var(--text-muted);
                margin-bottom: 4px;
                transition: color 0.2s;
            }

            .requirement.valid {
                color: #10b981;
            }

            .requirement.valid::marker {
                content: "✓ ";
            }

            .requirement.invalid {
                color: #ef4444;
            }

            .requirement.invalid::marker {
                content: "✗ ";
            }

            .spinner {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .loading-dots {
                display: flex;
                justify-content: center;
                gap: 8px;
            }

            .loading-dots span {
                width: 10px;
                height: 10px;
                background: var(--top-teal);
                border-radius: 50%;
                animation: bounce 1.4s ease-in-out infinite;
            }

            .loading-dots span:nth-child(1) { animation-delay: 0s; }
            .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
            .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    },

    populateExample() {
        alert('📊 Dados de exemplo devem ser criados via SQL!\n\nExecute o arquivo:\ndatabase/04_seed_data.sql\n\nNo Supabase SQL Editor');
    },

    addLoginStyles() {
        // Verifica se já existe
        if (document.getElementById('login-styles')) return;

        const style = document.createElement('style');
        style.id = 'login-styles';
        style.textContent = `
            .login-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #1e2938 0%, #1e6076 50%, #12b0a0 100%);
                padding: 20px;
                position: relative;
                overflow: hidden;
            }

            .login-bg-pattern {
                position: absolute;
                inset: 0;
                opacity: 0.1;
                pointer-events: none;
            }

            .login-bg-pattern::before,
            .login-bg-pattern::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent, white, transparent);
                transform: skewY(-12deg) scale(1.5);
            }

            .login-bg-pattern::after {
                transform: skewY(12deg) scale(1.5);
            }

            .login-content {
                width: 100%;
                max-width: 1050px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 1fr 400px;
                gap: 100px;
                align-items: center;
                position: relative;
                z-index: 10;
                min-height: 100vh;
                padding: 40px 0;
                box-sizing: border-box;
            }

            /* Left Side - Branding */
            .login-branding {
                display: flex;
                flex-direction: column;
                justify-content: center;
                color: white;
            }

            .login-branding-content {
                display: flex;
                flex-direction: column;
                gap: 36px;
            }

            .login-logo {
                height: 52px;
                width: auto;
                object-fit: contain;
                align-self: flex-start;
            }

            .login-title-block {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .login-main-title {
                font-size: 42px;
                font-weight: 700;
                line-height: 1.2;
                margin: 0;
                color: white;
            }

            .login-main-title .highlight {
                color: #4fd1c5;
            }

            .login-subtitle {
                font-size: 15px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.7;
                margin: 0;
                max-width: 400px;
            }

            /* Features */
            .login-features {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .login-feature-item {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 14px 18px;
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(8px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.2s ease;
            }

            .login-feature-item:hover {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateX(4px);
            }

            .login-feature-icon {
                width: 42px;
                height: 42px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: white;
            }

            .login-feature-icon svg {
                width: 20px;
                height: 20px;
            }

            .login-feature-item h3 {
                font-size: 14px;
                font-weight: 600;
                margin: 0 0 2px 0;
                color: white;
            }

            .login-feature-item p {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.55);
                margin: 0;
            }

            /* Right Side - Form */
            .login-form-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .login-card {
                background: white;
                border-radius: 24px;
                padding: 48px 40px;
                width: 100%;
                box-shadow:
                    0 4px 6px rgba(0, 0, 0, 0.05),
                    0 20px 50px rgba(0, 0, 0, 0.15),
                    0 40px 100px rgba(0, 0, 0, 0.1);
            }

            .login-card-header {
                text-align: center;
                margin-bottom: 36px;
            }

            .login-mobile-logo {
                display: none;
                margin-bottom: 28px;
            }

            .login-mobile-logo img {
                height: 48px;
                width: auto;
                object-fit: contain;
                margin: 0 auto;
                display: block;
            }

            .login-card-header h2 {
                font-size: 28px;
                font-weight: 700;
                color: #1a202c;
                margin: 0 0 8px 0;
            }

            .login-card-header p {
                font-size: 14px;
                color: #718096;
                margin: 0;
            }

            .login-form {
                margin-bottom: 20px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                font-weight: 500;
                font-size: 13px;
                color: #4a5568;
                margin-bottom: 8px;
            }

            .form-control {
                width: 100%;
                padding: 14px 16px;
                font-size: 14px;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                transition: all 0.2s ease;
                font-family: inherit;
                background: #f8fafc;
                box-sizing: border-box;
            }

            .form-control:hover {
                border-color: #cbd5e1;
            }

            .form-control:focus {
                outline: none;
                border-color: #12b0a0;
                background: white;
                box-shadow: 0 0 0 4px rgba(18, 176, 160, 0.1);
            }

            .form-control::placeholder {
                color: #a0aec0;
            }

            /* Password Input */
            .password-input-wrapper {
                position: relative;
            }

            .password-input-wrapper .form-control {
                padding-right: 50px;
            }

            .password-toggle {
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                height: 36px;
                width: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                cursor: pointer;
                color: #a0aec0;
                transition: color 0.2s;
                border-radius: 8px;
            }

            .password-toggle:hover {
                color: #4a5568;
                background: rgba(0, 0, 0, 0.04);
            }

            .btn-login {
                width: 100%;
                margin-top: 28px;
                height: 52px;
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 14px rgba(18, 176, 160, 0.35);
            }

            .btn-login:hover:not(:disabled) {
                background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(18, 176, 160, 0.45);
            }

            .btn-login:active:not(:disabled) {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(18, 176, 160, 0.3);
            }

            .btn-login:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }

            .btn-login .btn-loading {
                display: flex;
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

            .error-message {
                background: #fff5f5;
                color: #c53030;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 13px;
                margin-bottom: 16px;
                border: 1px solid #feb2b2;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .login-card-footer {
                text-align: center;
                padding-top: 24px;
                border-top: 1px solid #edf2f7;
            }

            .login-card-footer p {
                font-size: 12px;
                color: #a0aec0;
                margin: 0;
            }

            /* Responsive */
            @media (max-width: 1024px) {
                .login-content {
                    grid-template-columns: 1fr;
                    max-width: 420px;
                    gap: 0;
                    min-height: auto;
                }

                .login-branding {
                    display: none;
                }

                .login-mobile-logo {
                    display: block;
                }

                .login-card {
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
            }

            @media (max-width: 480px) {
                .login-container {
                    padding: 16px;
                }

                .login-card {
                    padding: 32px 24px;
                    border-radius: 16px;
                }

                .login-card-header h2 {
                    font-size: 22px;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

export { App };
