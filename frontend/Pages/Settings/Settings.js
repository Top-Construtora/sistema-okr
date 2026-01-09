import { AuthService } from '../../services/auth.js';

// Página de Configurações - Alteração de Senha
const SettingsPage = {
    async render() {
        const currentUser = AuthService.getCurrentUser();
        const content = document.getElementById('content');

        if (!currentUser) {
            content.innerHTML = '<p>Erro: Usuário não autenticado</p>';
            return;
        }

        content.innerHTML = `
            ${this.addStyles()}

            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <div class="card-header">
                    <h2 class="card-title">Alterar Senha</h2>
                    <p class="card-subtitle">Atualize sua senha de acesso ao sistema</p>
                </div>

                <div class="card-body">
                    <form id="password-form" onsubmit="event.preventDefault(); SettingsPage.changePassword();">
                        <div class="form-group">
                            <label for="current-password">Senha Atual</label>
                            <input
                                type="password"
                                id="current-password"
                                class="form-control"
                                placeholder="Digite sua senha atual"
                                required
                                autocomplete="current-password"
                            />
                        </div>

                        <div class="form-group">
                            <label for="new-password">Nova Senha</label>
                            <input
                                type="password"
                                id="new-password"
                                class="form-control"
                                placeholder="Digite a nova senha"
                                required
                                minlength="6"
                                autocomplete="new-password"
                                oninput="SettingsPage.updatePasswordStrength()"
                            />
                            <div class="password-strength" id="password-strength" style="display:none;">
                                <div class="password-strength-bar" id="password-strength-bar"></div>
                            </div>
                            <div class="password-strength-text" id="password-strength-text"></div>
                        </div>

                        <div class="form-group">
                            <label for="confirm-password">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                id="confirm-password"
                                class="form-control"
                                placeholder="Digite a nova senha novamente"
                                required
                                minlength="6"
                                autocomplete="new-password"
                            />
                        </div>

                        <div class="password-requirements">
                            <strong>Requisitos da senha:</strong>
                            <ul>
                                <li>Mínimo de 6 caracteres</li>
                                <li>Recomendado: mistura de letras, números e caracteres especiais</li>
                            </ul>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                Atualizar Senha
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Toast Container -->
            <div id="settings-toast-container" class="toast-container"></div>
        `;
    },

    updatePasswordStrength() {
        const password = document.getElementById('new-password').value;
        const strengthBar = document.getElementById('password-strength-bar');
        const strengthText = document.getElementById('password-strength-text');
        const strengthContainer = document.getElementById('password-strength');

        if (!password) {
            strengthContainer.style.display = 'none';
            strengthText.textContent = '';
            return;
        }

        strengthContainer.style.display = 'block';

        const strength = this.calculatePasswordStrength(password);

        strengthBar.className = 'password-strength-bar ' + strength.level;
        strengthText.textContent = 'Força da senha: ' + strength.label;
        strengthText.className = 'password-strength-text ' + strength.level;
    },

    calculatePasswordStrength(password) {
        let score = 0;

        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) {
            return { level: 'weak', label: 'Fraca' };
        } else if (score <= 3) {
            return { level: 'medium', label: 'Média' };
        } else {
            return { level: 'strong', label: 'Forte' };
        }
    },

    async changePassword() {
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validações
            if (!currentPassword || !newPassword || !confirmPassword) {
                this.showToast('Preencha todos os campos', 'error');
                return;
            }

            if (newPassword.length < 6) {
                this.showToast('A senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showToast('As senhas não coincidem', 'error');
                return;
            }

            if (currentPassword === newPassword) {
                this.showToast('A nova senha deve ser diferente da atual', 'error');
                return;
            }

            // Atualizar senha via AuthService
            const result = await AuthService.updatePassword(currentPassword, newPassword);

            if (result.success) {
                this.showToast(result.message || 'Senha alterada com sucesso!', 'success');

                // Limpar formulário
                document.getElementById('password-form').reset();
                document.getElementById('password-strength').style.display = 'none';
                document.getElementById('password-strength-text').textContent = '';
            } else {
                this.showToast(result.error || 'Erro ao alterar senha', 'error');
            }
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            this.showToast('Erro ao processar alteração de senha', 'error');
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('settings-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;

        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    addStyles() {
        return `
            <style>
                /* Card Styles (padronizado com outras páginas) */
                .card {
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                }

                .card-header {
                    padding: 24px 32px;
                    border-bottom: 1px solid var(--border-light);
                }

                .card-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 4px 0;
                }

                .card-subtitle {
                    font-size: 14px;
                    color: var(--text-muted);
                    margin: 0;
                }

                .card-body {
                    padding: 32px;
                }

                /* Form Styles */
                .form-group {
                    margin-bottom: 24px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .form-control {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 14px;
                    transition: all 0.2s;
                    background: var(--bg-main);
                }

                .form-control:focus {
                    outline: none;
                    border-color: var(--top-blue);
                    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
                }

                .form-control::placeholder {
                    color: var(--text-muted);
                }

                .form-actions {
                    margin-top: 32px;
                    display: flex;
                    gap: 12px;
                }

                /* Password Strength Indicator */
                .password-strength {
                    margin-top: 8px;
                    height: 4px;
                    background: var(--border);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .password-strength-bar {
                    height: 100%;
                    transition: all 0.3s;
                }

                .password-strength-bar.weak {
                    width: 33%;
                    background: #dc3545;
                }

                .password-strength-bar.medium {
                    width: 66%;
                    background: #ffc107;
                }

                .password-strength-bar.strong {
                    width: 100%;
                    background: #28a745;
                }

                .password-strength-text {
                    margin-top: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .password-strength-text.weak { color: #dc3545; }
                .password-strength-text.medium { color: #ffc107; }
                .password-strength-text.strong { color: #28a745; }

                .password-requirements {
                    margin-top: 20px;
                    padding: 16px;
                    background: var(--bg-main);
                    border-radius: var(--radius);
                    border-left: 3px solid var(--top-blue);
                }

                .password-requirements strong {
                    display: block;
                    font-size: 13px;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                }

                .password-requirements ul {
                    margin: 0;
                    padding-left: 20px;
                    list-style: disc;
                }

                .password-requirements li {
                    margin-bottom: 4px;
                    font-size: 13px;
                    color: var(--text-muted);
                }

                /* Toast Notifications */
                .toast-container {
                    position: fixed;
                    top: 80px;
                    right: 24px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .toast {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 300px;
                    padding: 14px 18px;
                    background: white;
                    border-radius: var(--radius);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    opacity: 0;
                    transform: translateX(400px);
                    transition: all 0.3s ease;
                }

                .toast.show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .toast-icon {
                    font-size: 18px;
                    font-weight: 700;
                    line-height: 1;
                }

                .toast-message {
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .toast-success {
                    border-left: 4px solid #28a745;
                }

                .toast-success .toast-icon {
                    color: #28a745;
                }

                .toast-error {
                    border-left: 4px solid #dc3545;
                }

                .toast-error .toast-icon {
                    color: #dc3545;
                }

                .toast-warning {
                    border-left: 4px solid #ffc107;
                }

                .toast-warning .toast-icon {
                    color: #ffc107;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .card {
                        margin: 0;
                        border-radius: 0;
                    }

                    .card-header {
                        padding: 20px;
                    }

                    .card-body {
                        padding: 20px;
                    }

                    .toast-container {
                        left: 12px;
                        right: 12px;
                    }

                    .toast {
                        min-width: auto;
                        width: 100%;
                    }
                }
            </style>
        `;
    }
};

export { SettingsPage };
