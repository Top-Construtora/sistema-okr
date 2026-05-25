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
// Filtros de pesquisa para listas de responsáveis
// =====================================================

// Filtra itens de uma lista (checkboxes/chips) pelo texto.
window.filterResponsibleList = function(inputEl, containerSelector, itemSelector) {
    const q = (inputEl.value || '').trim().toLowerCase();
    const container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;
    if (!container) return;
    const items = container.querySelectorAll(itemSelector);
    let visible = 0;
    items.forEach(item => {
        const text = (item.textContent || '').toLowerCase();
        const match = !q || text.includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visible++;
    });
    // Mensagem "nenhum resultado"
    let empty = container.querySelector('.responsible-search-empty');
    if (visible === 0 && q) {
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'responsible-search-empty';
            empty.style.cssText = 'padding:8px 12px;color:#9ca3af;font-size:13px;';
            empty.textContent = 'Nenhum responsável encontrado';
            container.appendChild(empty);
        }
        empty.style.display = '';
    } else if (empty) {
        empty.style.display = 'none';
    }
};

// Filtra opções de um <select> pelo texto.
window.filterResponsibleSelect = function(inputEl, selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    if (!sel.dataset._allOptionsHtml) {
        sel.dataset._allOptionsHtml = sel.innerHTML;
    }
    const q = (inputEl.value || '').trim().toLowerCase();
    const currentValue = sel.value;
    const tmp = document.createElement('select');
    tmp.innerHTML = sel.dataset._allOptionsHtml;
    const opts = Array.from(tmp.querySelectorAll('option'));
    const filtered = opts.filter(o => !o.value || !q || o.textContent.toLowerCase().includes(q) || o.value === currentValue);
    sel.innerHTML = filtered.map(o => o.outerHTML).join('');
    sel.value = currentValue;
};

// =====================================================
// Sistema de Menu Dropdown - Solução com Portal
// O menu é criado diretamente no body para evitar
// qualquer problema de posicionamento
// =====================================================

(function() {
    // Container do menu (será criado uma vez)
    let menuContainer = null;
    let currentMenuId = null;

    // Cria o container do menu no body
    function getMenuContainer() {
        if (!menuContainer) {
            menuContainer = document.createElement('div');
            menuContainer.id = 'dropdown-menu-portal';
            menuContainer.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:99999;';
            document.body.appendChild(menuContainer);
        }
        return menuContainer;
    }

    // Fecha o menu atual
    window.closeAllDropdownMenus = function() {
        const container = getMenuContainer();
        container.innerHTML = '';
        currentMenuId = null;
    };

    // Abre um menu dropdown
    window.openDropdownMenu = function(button, menuId) {
        // Se já está aberto este menu, fecha
        if (currentMenuId === menuId) {
            window.closeAllDropdownMenus();
            return;
        }

        // Fecha qualquer menu aberto
        window.closeAllDropdownMenus();

        // Busca o menu original para copiar o conteúdo
        const originalMenu = document.getElementById(menuId);
        if (!originalMenu || !button) return;

        // Obtém posição do botão
        const rect = button.getBoundingClientRect();

        // Cria o menu no portal
        const container = getMenuContainer();
        const menu = document.createElement('div');
        menu.className = 'dropdown-portal-menu';
        menu.innerHTML = originalMenu.innerHTML;

        // Estilo inline para garantir posicionamento
        menu.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.18);
            border: 1px solid #e2e8f0;
            padding: 4px 0;
            min-width: 145px;
            z-index: 99999;
        `;

        // Adiciona ao container temporariamente para medir
        container.appendChild(menu);

        // Dimensões do menu
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        // Viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Calcula posição
        let top = rect.bottom + 5;
        let left = rect.right - menuWidth;

        // Ajusta se sair da tela
        if (top + menuHeight > vh - 10) {
            top = rect.top - menuHeight - 5;
        }
        if (left < 10) {
            left = 10;
        }
        if (left + menuWidth > vw - 10) {
            left = vw - menuWidth - 10;
        }

        // Aplica posição final
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';

        currentMenuId = menuId;
    };

    // Compatibilidade
    window.positionDropdownMenu = window.openDropdownMenu;

    // Fecha ao clicar fora
    document.addEventListener('click', function(e) {
        // Se clicou no botão de ação, ignora (toggleMenu vai lidar)
        if (e.target.closest('.action-menu-btn')) {
            return;
        }
        // Se clicou dentro do menu portal, não fecha
        if (e.target.closest('.dropdown-portal-menu')) {
            return;
        }
        // Fecha o menu
        window.closeAllDropdownMenus();
    });

    // Fecha com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeAllDropdownMenus();
        }
    });

    // Fecha ao rolar a página
    window.addEventListener('scroll', function() {
        window.closeAllDropdownMenus();
    }, true);
})();
