import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import departmentRoutes from './routes/department.routes.js';
import userRoutes from './routes/user.routes.js';
import okrRoutes from './routes/okr.routes.js';
import objectiveRoutes from './routes/objective.routes.js';
import statsRoutes from './routes/stats.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de CORS com suporte a múltiplas origens
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(url => url.trim().replace(/\/$/, '')); // Remove barra final

console.log('🔐 Origens CORS permitidas:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Permite requisições sem origin (como apps mobile, Postman, etc)
        if (!origin) {
            console.log('✅ CORS: Requisição sem origin (permitida)');
            return callback(null, true);
        }

        // Normaliza a origem removendo barra final
        const normalizedOrigin = origin.replace(/\/$/, '');

        if (allowedOrigins.includes(normalizedOrigin)) {
            console.log(`✅ CORS: Origem permitida: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS: Origem BLOQUEADA: ${origin}`);
            console.warn(`    Origens permitidas: ${allowedOrigins.join(', ')}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

// IMPORTANTE: CORS antes do helmet
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Sistema OKR Backend API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/okrs', okrRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/stats', statsRoutes);

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
