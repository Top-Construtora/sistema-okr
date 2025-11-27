// App Principal
import { StorageService } from './services/storage.js';
import { AuthService } from './services/auth.js';

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
                this.renderApp();
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
