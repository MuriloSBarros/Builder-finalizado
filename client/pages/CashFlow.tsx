/**
 * PÁGINA PRINCIPAL - FLUXO DE CAIXA
 * =================================
 *
 * Sistema completo de controle financeiro para escritórios de advocacia.
 * Inclui transações, categorias específicas, relatórios e exportação.
 * 
 * ACESSO RESTRITO: Apenas Conta Composta e Gerencial
 */

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  BarChart3,
  Repeat,
  FileSpreadsheet,
} from 'lucide-react';
import { TransactionForm } from '@/components/CashFlow/TransactionForm';
import { TransactionsTable } from '@/components/CashFlow/TransactionsTable';
import { TransactionViewDialog } from '@/components/CashFlow/TransactionViewDialog';
import { Transaction, TransactionStatus, PaymentMethod } from '@/types/cashflow';
import { apiService } from '@/services/api';

export function CashFlow() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransactionView, setShowTransactionView] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const data = await apiService.getTransactions(filters);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, typeFilter, categoryFilter, statusFilter]);

  const handleSubmitTransaction = async (data: any) => {
    try {
      if (editingTransaction) {
        await apiService.updateTransaction(editingTransaction.id, data);
      } else {
        await apiService.createTransaction(data);
      }
      
      await fetchTransactions(); // Refresh data
      setEditingTransaction(undefined);
      setShowTransactionForm(false);
      setShowRecurringForm(false);
    } catch (error) {
      console.error('Error submitting transaction:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTransactions(checked ? transactions.map(t => t.id) : []);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await apiService.deleteTransaction(transactionId);
      await fetchTransactions(); // Refresh data
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir transação. Tente novamente.');
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction);
    setShowTransactionView(true);
  };

  const handleDuplicateTransaction = (transaction: Transaction) => {
    const duplicatedData = {
      ...transaction,
      description: `${transaction.description} (Cópia)`,
      date: new Date().toISOString().split('T')[0],
    };
    setEditingTransaction(undefined);
    setShowTransactionForm(true);
    // Pre-fill form with duplicated data
    setTimeout(() => {
      setEditingTransaction(duplicatedData as Transaction);
    }, 100);
  };

  const handleEditFromView = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionView(false);
    setShowTransactionForm(true);
  };

  const handleExportCSV = async () => {
    try {
      const filters = {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const response = await apiService.exportTransactionsCSV(filters);
      
      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('✅ Relatório CSV exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Erro ao exportar CSV. Tente novamente.');
    }
  };

  // Calculate metrics from real data
  const metrics = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: currentMonthTransactions.length,
    };
  }, [transactions]);

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
            <h3 className="text-lg font-semibold text-red-600 mb-2">Erro ao carregar fluxo de caixa</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchTransactions} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fluxo de Caixa</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
            <p className="text-muted-foreground">
              Controle financeiro completo do escritório
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowRecurringForm(true)}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Criar Recorrente
            </Button>
            <Button onClick={() => setShowTransactionForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </div>
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
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.balance >= 0 ? 'Lucro' : 'Prejuízo'} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transações</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.transactionCount}</div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procurar transações..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Transações ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={transactions}
              selectedTransactions={selectedTransactions}
              onSelectTransaction={handleSelectTransaction}
              onSelectAll={handleSelectAll}
              onViewTransaction={handleViewTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onDuplicateTransaction={handleDuplicateTransaction}
            />
          </CardContent>
        </Card>

        {/* Transaction Form Modal */}
        <TransactionForm
          open={showTransactionForm}
          onOpenChange={setShowTransactionForm}
          transaction={editingTransaction}
          onSubmit={handleSubmitTransaction}
          isEditing={!!editingTransaction}
        />

        {/* Recurring Transaction Form Modal */}
        <TransactionForm
          open={showRecurringForm}
          onOpenChange={setShowRecurringForm}
          onSubmit={handleSubmitTransaction}
          forceRecurring={true}
        />

        {/* Transaction View Dialog */}
        <TransactionViewDialog
          open={showTransactionView}
          onOpenChange={setShowTransactionView}
          transaction={viewingTransaction}
          onEdit={handleEditFromView}
          onDuplicate={handleDuplicateTransaction}
        />
      </div>
    </DashboardLayout>
  );
}