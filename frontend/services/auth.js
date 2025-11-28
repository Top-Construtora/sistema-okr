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
            // Logout do Supabase Auth
            await supabaseClient.auth.signOut();
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

    // Admin é criado via Supabase Auth Dashboard
    async initializeDefaultAdmin() {
        return true;
    }
};

export { AuthService };
