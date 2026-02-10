import express from 'express';
import supabase, { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /api/users - Listar todos os usuários
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*, departments:user_departments(department_id, is_primary, department:departments(id, nome))')
            .order('nome');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Criar novo usuário (usa Admin API para bypass de signup restrictions)
router.post('/', async (req, res) => {
    try {
        const { nome, email, senha, tipo, departamento_id, departments } = req.body;

        // Validações
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        if (senha.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        // Verificar se email já existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .ilike('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Já existe um usuário com este email' });
        }

        // Determinar departamento principal
        const primaryDeptId = departments && departments.length > 0
            ? (departments.find(d => d.is_primary)?.id || departments[0]?.id || departments[0])
            : departamento_id;

        // 1. Criar usuário no Supabase Auth usando Admin API (ignora restrições de signup)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: senha,
            email_confirm: true, // Confirma email automaticamente
            user_metadata: {
                nome: nome,
                tipo: tipo || 'colaborador',
                departamento_id: primaryDeptId
            }
        });

        if (authError) {
            console.error('Erro ao criar usuário no Auth:', authError);
            throw authError;
        }

        console.log('✅ Usuário criado no Auth:', authData.user.id);

        // 2. Aguardar um pouco para o trigger processar (se houver)
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. Verificar se o trigger criou o usuário na tabela users
        let { data: createdUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authData.user.id)
            .single();

        // Se o trigger não criou, criar manualmente
        if (!createdUser) {
            console.log('Trigger não criou usuário, criando manualmente...');

            const { data: manualUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    auth_id: authData.user.id,
                    nome: nome,
                    email: email,
                    tipo: tipo || 'colaborador',
                    departamento_id: primaryDeptId,
                    ativo: true,
                    primeiro_acesso: true
                })
                .select()
                .single();

            if (insertError) {
                console.error('Erro ao inserir usuário na tabela:', insertError);
                // Tentar deletar o usuário do Auth se falhar
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw insertError;
            }

            createdUser = manualUser;
        }

        // 4. Criar vínculos de departamentos
        if (departments && departments.length > 0 && createdUser) {
            const records = departments.map((dept, idx) => ({
                user_id: createdUser.id,
                department_id: typeof dept === 'string' ? dept : dept.id,
                is_primary: idx === 0 || dept.is_primary === true
            }));

            const { error: deptError } = await supabaseAdmin
                .from('user_departments')
                .insert(records);

            if (deptError) {
                console.warn('Erro ao vincular departamentos:', deptError);
            }
        }

        console.log('✅ Usuário criado com sucesso:', createdUser.id);
        res.status(201).json(createdUser);

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar usuário' });
    }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, tipo, departamento_id, departments, ativo } = req.body;

        const updateData = {};
        if (nome !== undefined) updateData.nome = nome;
        if (tipo !== undefined) updateData.tipo = tipo;
        if (departamento_id !== undefined) updateData.departamento_id = departamento_id;
        if (ativo !== undefined) updateData.ativo = ativo;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Atualizar departamentos se fornecidos
        if (departments && departments.length > 0) {
            // Remover vínculos antigos
            await supabaseAdmin
                .from('user_departments')
                .delete()
                .eq('user_id', id);

            // Inserir novos
            const records = departments.map((dept, idx) => ({
                user_id: id,
                department_id: typeof dept === 'string' ? dept : dept.id,
                is_primary: idx === 0 || dept.is_primary === true
            }));

            await supabaseAdmin
                .from('user_departments')
                .insert(records);
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id - Excluir usuário
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar auth_id do usuário
        const { data: user } = await supabase
            .from('users')
            .select('auth_id')
            .eq('id', id)
            .single();

        // Deletar da tabela users
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Tentar deletar do Auth também (se tiver auth_id)
        if (user?.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
