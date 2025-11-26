// =====================================================
// MAIN.JS - Entry Point do Sistema OKR
// Vite carrega este arquivo automaticamente
// =====================================================

// Importa CSS
import './styles.css'

// 1. Importa e expõe globals
import './globals.js'

// 2. Importa Entidades (order matters!)
import { Cycle } from './Entities/Cycle.js'
import { MiniCycle } from './Entities/MiniCycle.js'
import { Department } from './Entities/Department.js'
import { User } from './Entities/User.js'
import { OKR, OKR_STATUS } from './Entities/OKR.js'
import './Entities/KeyResult.js'

// 3. Importa Layout
import { Layout } from './Layout.js'

// 4. Importa Pages
import { DashboardPage } from './Pages/Dashboard/Dashboard.js'
import { ObjectivesPage } from './Pages/Objectives/Objectives.js'
import { CyclesPage } from './Pages/Cycles/Cycles.js'
import { DepartmentsPage } from './Pages/Departments/Departments.js'
import { UsersPage } from './Pages/Users/Users.js'
import { OKRsPage } from './Pages/OKRs/OKRs.js'
import { ApprovalPage } from './Pages/ApprovalCommittee/ApprovalCommittee.js'

// 5. Importa App
import { App } from './app.js'

// Expõe tudo globalmente (necessário para onclick handlers inline)
window.Cycle = Cycle;
window.MiniCycle = MiniCycle;
window.Department = Department;
window.User = User;
window.OKR = OKR;
window.OKR_STATUS = OKR_STATUS;
window.Layout = Layout;
window.DashboardPage = DashboardPage;
window.ObjectivesPage = ObjectivesPage;
window.CyclesPage = CyclesPage;
window.DepartmentsPage = DepartmentsPage;
window.UsersPage = UsersPage;
window.OKRsPage = OKRsPage;
window.ApprovalPage = ApprovalPage;
window.App = App;

// Inicializa o aplicativo
App.init();
