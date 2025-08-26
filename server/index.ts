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
  app.use(cors());
  app.use(compression());
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Make database available globally
  global.db = db;

  // Health check
  app.get("/health", async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          server: 'running'
        }
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        error: error.message 
      });
    }
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
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
