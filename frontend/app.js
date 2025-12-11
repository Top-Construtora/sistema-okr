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
                <div class="login-card">
                    <div class="login-header">
                        <div class="brand-icon">
                            <img src="/gio.png" alt="Logo" style="width:100%;height:100%;object-fit:contain;">
                        </div>
                        <h1>TOP Construtora</h1>
                        <p>Sistema de Gestão OKR</p>
                    </div>
                    <form id="loginForm" class="login-form">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="email" class="form-control" placeholder="seu@email.com" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label>Senha</label>
                            <input type="password" id="senha" class="form-control" placeholder="Sua senha" required autocomplete="current-password">
                        </div>
                        <div id="loginError" class="error-message" style="display:none;"></div>
                        <button type="submit" class="btn btn-primary btn-block">
                            Entrar
                        </button>
                    </form>
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

    async handleLogin() {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        // Desabilita botão
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

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
            submitBtn.textContent = 'Entrar';
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
                background: linear-gradient(135deg, #1e6076 0%, #12b0a0 100%);
                padding: 20px;
            }

            .login-card {
                background: white;
                border-radius: 16px;
                padding: 40px;
                width: 100%;
                max-width: 420px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }

            .login-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .login-header .brand-icon {
                width: 64px;
                height: 64px;
                background: var(--top-teal);
                border-radius: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 20px;
                color: white;
                margin-bottom: 16px;
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.4);
            }

            .login-header h1 {
                font-size: 24px;
                color: var(--top-blue);
                margin-bottom: 4px;
            }

            .login-header p {
                color: var(--text-muted);
                font-size: 14px;
            }

            .login-form {
                margin-bottom: 24px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                font-weight: 600;
                font-size: 13px;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .form-control {
                width: 100%;
                padding: 12px 16px;
                font-size: 14px;
                border: 1px solid var(--border);
                border-radius: var(--radius);
                transition: all 0.15s;
                font-family: inherit;
            }

            .form-control:focus {
                outline: none;
                border-color: var(--top-teal);
                box-shadow: 0 0 0 3px rgba(18, 176, 160, 0.1);
            }

            .btn-block {
                width: 100%;
                margin-top: 24px;
            }

            .error-message {
                background: var(--danger-bg);
                color: var(--danger);
                padding: 12px;
                border-radius: var(--radius);
                font-size: 13px;
                margin-bottom: 16px;
                border: 1px solid var(--danger);
            }

            .login-footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid var(--border-light);
            }

            .login-footer small {
                color: var(--text-muted);
                font-size: 12px;
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
