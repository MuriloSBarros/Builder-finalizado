import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { db } from "./config/database";

// Import routes
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";
import { crmRoutes } from "./routes/crm";
import { projectsRoutes } from "./routes/projects";
import { tasksRoutes } from "./routes/tasks";
import { cashFlowRoutes } from "./routes/cashFlow";
import { billingRoutes } from "./routes/billing";
import { receivablesRoutes } from "./routes/receivables";
import { publicationsRoutes } from "./routes/publications";
import { notificationsRoutes } from "./routes/notifications";

export function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
  }));

  // Middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true
  }));
  
  app.use(compression());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Make database available globally
  (global as any).db = db;

  // Initialize database on startup (non-blocking)
  db.initializeDatabase().catch(error => {
    console.error('Database initialization failed:', error);
  });

  // Health check
  app.get("/health", async (req, res) => {
    try {
      const supabase = db.getSupabaseClient();
      if (supabase) {
        // Test Supabase connection
        const { data, error } = await supabase.from('users').select('count').limit(1);
        
        res.json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          services: {
            database: error ? 'degraded' : 'connected',
            server: 'running'
          }
        });
      } else {
        res.json({ 
          status: 'degraded', 
          timestamp: new Date().toISOString(),
          services: {
            database: 'not_configured',
            server: 'running'
          }
        });
      }
    } catch (error: any) {
      res.status(503).json({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/crm", crmRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/cash-flow", cashFlowRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/receivables", receivablesRoutes);
  app.use("/api/publications", publicationsRoutes);
  app.use("/api/notifications", notificationsRoutes);

  // Example API routes for testing
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  });

  return app;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(`🚀 Backend server running on port ${port}`);
    console.log(`📱 API: http://localhost:${port}/api`);
    console.log(`🔧 Health: http://localhost:${port}/health`);
  });
}