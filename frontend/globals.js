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

// =====================================================
// Utilitário: Posicionar menu dropdown com position fixed
// =====================================================
window.positionDropdownMenu = function(button, menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = menu.offsetHeight || 150;
    const menuWidth = menu.offsetWidth || 160;

    // Calcula posição
    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;

    // Se não cabe embaixo, abre para cima
    if (top + menuHeight > window.innerHeight - 10) {
        top = rect.top - menuHeight - 4;
    }

    // Se não cabe na direita, ajusta
    if (left < 10) {
        left = 10;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
};

// Fecha todos os menus dropdown
window.closeAllDropdownMenus = function() {
    document.querySelectorAll('.action-menu-dropdown').forEach(menu => {
        menu.classList.remove('show');
    });
};

// Listener global para fechar menus ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) {
        window.closeAllDropdownMenus();
    }
});
