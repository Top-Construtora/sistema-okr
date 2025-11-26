// =====================================================
// GLOBALS - Expõe módulos globalmente para onclick handlers
// =====================================================

import { supabaseClient, handleSupabaseError } from './services/supabase.js';
import { StorageService, uid } from './services/storage.js';
import { AuthService } from './services/auth.js';

// Expõe globalmente
window.supabaseClient = supabaseClient;
window.handleSupabaseError = handleSupabaseError;
window.StorageService = StorageService;
window.AuthService = AuthService;
window.uid = uid;
