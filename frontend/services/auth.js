// Serviço de Autenticação - Versão Supabase Auth
import { supabaseClient } from './supabase.js';
import { StorageService } from './storage.js';

const AuthService = {
    // Faz login usando Supabase Auth
    async login(email, senha) {
        try {
            // 1. Autentica no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha,
            });

            if (authError) {
                console.error('❌ Erro na autenticação:', authError.message);
                return null;
            }

            if (!authData.user) {
                console.error('❌ Nenhum usuário retornado');
                return null;
            }

            // 2. Busca dados do usuário na tabela users
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('*, departamento:departments(id, nome)')
                .eq('email', email)
                .eq('ativo', true)
                .single();

            if (userError || !userData) {
                console.error('❌ Erro ao buscar dados do usuário:', userError);
                // Faz logout do Supabase Auth se não encontrar o usuário
                await supabaseClient.auth.signOut();
                return null;
            }

            // 3. Busca departamentos vinculados (múltiplos departamentos)
            const { data: userDepts } = await supabaseClient
                .from('user_departments')
                .select('department_id, is_primary, departments(id, nome)')
                .eq('user_id', userData.id);

            if (userDepts && userDepts.length > 0) {
                userData.departments = userDepts.map(ud => ({
                    id: ud.departments.id,
                    nome: ud.departments.nome,
                    is_primary: ud.is_primary
                }));
            } else if (userData.departamento) {
                // Fallback para departamento único legado
                userData.departments = [{
                    id: userData.departamento.id,
                    nome: userData.departamento.nome,
                    is_primary: true
                }];
            }

            // 4. Adiciona o auth_id aos dados do usuário
            userData.auth_id = authData.user.id;

            // 5. Salva na sessão
            StorageService.setCurrentUser(userData);
            return userData;
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return null;
        }
    },

    // Faz logout
    async logout() {
        try {
            // Marca que foi logout explícito (para não auto-logar novamente)
            localStorage.setItem('explicit_logout', Date.now().toString());

            // Logout do Supabase Auth com scope global
            await supabaseClient.auth.signOut({ scope: 'global' });
        } catch (error) {
            console.error('Erro no logout:', error);
        }

        // Limpa sessão local
        StorageService.setCurrentUser(null);
        sessionStorage.clear();
    },

    // Pega usuário atual
    getCurrentUser() {
        return StorageService.getCurrentUser();
    },

    // Verifica se está autenticado
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    // Verifica se é admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.tipo === 'admin';
    },

    // Verifica se é consultor
    isConsultor() {
        const user = this.getCurrentUser();
        return user && user.tipo === 'consultor';
    },

    // Verifica se pode acessar o Comitê de Aprovação (admin ou consultor)
    canAccessApproval() {
        const user = this.getCurrentUser();
        return user && (user.tipo === 'admin' || user.tipo === 'consultor');
    },

    // Verifica sessão do Supabase Auth
    async checkSession() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            return !!session;
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            return false;
        }
    },

    // Login com Microsoft (Azure AD OAuth)
    async loginWithMicrosoft() {
        try {
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'azure',
                options: {
                    scopes: 'email User.Read offline_access',
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro no login Microsoft:', error);
            throw error;
        }
    },

    // Completa o login após callback OAuth (Microsoft)
    async handleOAuthCallback() {
        try {
            // Verifica se há tokens na URL hash
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            // Se há tokens na URL, define a sessão manualmente
            if (accessToken) {
                const { error: setSessionError } = await supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });

                if (setSessionError) {
                    console.error('Erro ao definir sessão:', setSessionError);
                    return null;
                }
            }

            // Pega a sessão atual do Supabase
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

            if (sessionError || !session) {
                console.error('Erro ao obter sessão OAuth:', sessionError);
                return null;
            }

            const authUser = session.user;
            const email = authUser.email;

            // Busca dados do usuário na tabela users
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('*, departamento:departments(id, nome)')
                .eq('email', email)
                .eq('ativo', true)
                .single();

            if (userError || !userData) {
                console.error('Usuário não encontrado na tabela users:', userError);
                await supabaseClient.auth.signOut();
                return null;
            }

            // Busca departamentos vinculados (múltiplos departamentos)
            const { data: userDepts } = await supabaseClient
                .from('user_departments')
                .select('department_id, is_primary, departments(id, nome)')
                .eq('user_id', userData.id);

            if (userDepts && userDepts.length > 0) {
                userData.departments = userDepts.map(ud => ({
                    id: ud.departments.id,
                    nome: ud.departments.nome,
                    is_primary: ud.is_primary
                }));
            } else if (userData.departamento) {
                userData.departments = [{
                    id: userData.departamento.id,
                    nome: userData.departamento.nome,
                    is_primary: true
                }];
            }

            // Adiciona o auth_id
            userData.auth_id = authUser.id;

            // Salva na sessão
            StorageService.setCurrentUser(userData);
            return userData;
        } catch (error) {
            console.error('Erro no callback OAuth:', error);
            return null;
        }
    },

    // Admin é criado via Supabase Auth Dashboard
    async initializeDefaultAdmin() {
        return true;
    },

    // Solicita reset de senha via email
    async requestPasswordReset(email) {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/auth/password-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Erro ao solicitar recuperação de senha'
                };
            }

            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            console.error('Erro ao solicitar reset de senha:', error);
            return {
                success: false,
                error: 'Erro ao processar solicitação'
            };
        }
    },

    // Redefine a senha usando o token
    async resetPassword(token, newPassword) {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/auth/confirm-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Erro ao redefinir senha'
                };
            }

            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            return {
                success: false,
                error: 'Erro ao processar redefinição de senha'
            };
        }
    },

    // Atualiza senha do usuário logado (usado em Settings)
    async updatePassword(currentPassword, newPassword) {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Usuário não autenticado' };
            }

            // 1. Verifica senha atual
            const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) {
                return { success: false, error: 'Senha atual incorreta' };
            }

            // 2. Atualiza para nova senha
            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                return { success: false, error: updateError.message };
            }

            return { success: true, message: 'Senha alterada com sucesso!' };
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            return {
                success: false,
                error: 'Erro ao processar alteração de senha'
            };
        }
    },

    // Login via SSO (Single Sign-On) do GIO
    async loginWithSSO(ssoToken) {
        try {
            console.log('🔐 Iniciando autenticação SSO...');

            // Remove flag de logout explícito (usuário está tentando logar via SSO)
            localStorage.removeItem('explicit_logout');

            // Chama o backend para validar o token SSO
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/auth/sso-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: ssoToken })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('❌ Erro na autenticação SSO:', data.error);
                return {
                    success: false,
                    error: data.error || 'Erro ao autenticar via SSO'
                };
            }

            console.log('✅ Token SSO validado. Carregando dados completos do usuário...');

            // Busca dados completos do usuário e departamento
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('*, departamento:departments(id, nome)')
                .eq('email', data.user.email)
                .eq('ativo', true)
                .single();

            if (userError || !userData) {
                console.error('❌ Erro ao buscar dados do usuário:', userError);
                // Fallback: usa dados retornados pelo backend
                userData = data.user;
            }

            // Busca departamentos vinculados (múltiplos departamentos)
            const { data: userDepts } = await supabaseClient
                .from('user_departments')
                .select('department_id, is_primary, departments(id, nome)')
                .eq('user_id', userData.id);

            if (userDepts && userDepts.length > 0) {
                userData.departments = userDepts.map(ud => ({
                    id: ud.departments.id,
                    nome: ud.departments.nome,
                    is_primary: ud.is_primary
                }));
            } else if (userData.departamento) {
                // Fallback para departamento único legado
                userData.departments = [{
                    id: userData.departamento.id,
                    nome: userData.departamento.nome,
                    is_primary: true
                }];
            }

            // Salva na sessão local
            // NOTA: SSO não cria sessão Supabase Auth, apenas sessão local
            StorageService.setCurrentUser(userData);

            console.log('✅ Autenticação SSO realizada com sucesso!');

            return {
                success: true,
                user: userData
            };
        } catch (error) {
            console.error('❌ Erro ao processar SSO:', error);
            return {
                success: false,
                error: 'Erro ao processar autenticação SSO'
            };
        }
    }
};

export { AuthService };
