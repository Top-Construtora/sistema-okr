// =====================================================
// CONFIGURAÇÃO SUPABASE - Versão Vite
// =====================================================

import { createClient } from '@supabase/supabase-js'

// Carrega credenciais do arquivo .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANON_AQUI';

// Inicializa o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validação de configuração
if (SUPABASE_URL === 'https://SEU_PROJETO.supabase.co' || !SUPABASE_URL.includes('supabase.co')) {
    console.error('❌ SUPABASE NÃO CONFIGURADO!');
    console.error('📝 Siga estes passos:');
    console.error('   1. Copie .env.example para .env');
    console.error('   2. Edite o arquivo .env');
    console.error('   3. Adicione suas credenciais do Supabase');
    console.error('   4. Reinicie o servidor (npm run dev)');
}

// =====================================================
// UTILITÁRIO: Tratamento de erros
// =====================================================

function handleSupabaseError(error, defaultMessage = 'Erro ao processar dados') {
    console.error('Supabase error:', error);

    if (error.message) {
        return error.message;
    }

    return defaultMessage;
}

// Exporta cliente para uso em outros arquivos
export { supabaseClient, handleSupabaseError };
