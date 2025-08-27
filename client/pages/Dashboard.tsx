import React, { useState, useEffect } from "react";
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Activity,
  Calendar,
  FileText,
  Clock,
  Eye,
} from "lucide-react";
import { DashboardCharts } from "@/components/Dashboard/Charts";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { metrics, activities, loading, error } = useDashboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getActivityIcon = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      Users,
      FileText,
      Clock,
      DollarSign,
      Activity,
    };
    const IconComponent = icons[iconName] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Erro ao carregar dashboard</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu escritório de advocacia
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.revenue?.value || 0)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics?.revenue?.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                )}
                <span>+{metrics?.revenue?.change || 0}% este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics?.expenses?.value || 0)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics?.expenses?.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <TrendingUp className="h-3 w-3 mr-1 text-red-600" />
                )}
                <span>{metrics?.expenses?.change || 0}% este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (metrics?.balance?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(metrics?.balance?.value || 0)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics?.balance?.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                )}
                <span>{metrics?.balance?.change || 0}% este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.clients?.value || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span>+{metrics?.clients?.change || 0}% este mês</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <DashboardCharts />

        {/* Recent Activities */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities && activities.length > 0 ? (
                  activities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${activity.color} bg-opacity-10`}>
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.time).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/notificacoes')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todas as Atividades
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/crm')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar Cliente
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/projetos')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/tarefas')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/fluxo-caixa')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}