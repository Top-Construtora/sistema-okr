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

// =====================================================
// UTILITÁRIO: URL de proxy para arquivos
// =====================================================

// URL do backend para proxy de arquivos (esconde URL do Supabase)
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Gera URL de proxy para arquivos do storage
 * @param {string} bucket - Nome do bucket (ex: 'evidencias')
 * @param {string} filePath - Caminho do arquivo no bucket
 * @param {string} action - 'view' para visualizar, 'download' para baixar (default: 'view')
 * @returns {string} URL de proxy para o arquivo
 */
function getProxyUrl(bucket, filePath, action = 'view') {
    return `${BACKEND_URL}/api/evidence/${action}/${bucket}/${filePath}`;
}

/**
 * Converte URL do Supabase Storage para URL de proxy (visualização)
 * @param {string} url - URL original (pode ser do Supabase ou já de proxy)
 * @returns {string} URL de proxy para visualizar o arquivo
 */
function convertToProxyUrl(url) {
    if (!url) return url;

    // Se já é uma URL de proxy, ajusta para view
    if (url.includes('/api/evidence/')) {
        return url.replace('/api/evidence/download/', '/api/evidence/view/');
    }

    // Padrão da URL pública do Supabase:
    // https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
    const supabasePattern = /supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
    const match = url.match(supabasePattern);

    if (match) {
        const bucket = match[1];
        const filePath = match[2];
        return getProxyUrl(bucket, filePath, 'view');
    }

    // Se não é URL do Supabase, retorna como está
    return url;
}

/**
 * Converte URL para URL de proxy de download (força baixar)
 * @param {string} url - URL original
 * @returns {string} URL de proxy para download do arquivo
 */
function convertToDownloadUrl(url) {
    if (!url) return url;

    // Se já é uma URL de proxy, ajusta para download
    if (url.includes('/api/evidence/')) {
        return url.replace('/api/evidence/view/', '/api/evidence/download/');
    }

    // Padrão da URL pública do Supabase
    const supabasePattern = /supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
    const match = url.match(supabasePattern);

    if (match) {
        const bucket = match[1];
        const filePath = match[2];
        return getProxyUrl(bucket, filePath, 'download');
    }

    return url;
}

// Exporta cliente para uso em outros arquivos
export { supabaseClient, handleSupabaseError, getProxyUrl, convertToProxyUrl, convertToDownloadUrl };
