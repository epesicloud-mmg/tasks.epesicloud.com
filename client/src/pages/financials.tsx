import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { AIAssistantWidget } from "@/components/ai-assistant-widget";
import CreateWorkspaceModal from "@/components/modals/create-workspace-modal";
import CreateProjectModal from "@/components/modals/create-project-modal";
import CreateCategoryModal from "@/components/modals/create-category-modal";
import AddMemberModal from "@/components/modals/add-member-modal";
import EditProjectModal from "@/components/modals/edit-project-modal";
import EditCategoryModal from "@/components/modals/edit-category-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  BarChart3,
  PieChart,
  Calculator,
  Package,
  AlertCircle,
  Receipt,
  CreditCard,
  User,
  Settings,
  LogOut,
  UserCircle,
  Building,
  HelpCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Form schemas
const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  description: z.string().optional(),
  type: z.enum(["milestone", "phase", "section"]),
  status: z.enum(["active", "completed", "cancelled"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workspaceId: z.number()
});

const budgetSchema = z.object({
  componentId: z.number().optional(),
  budgetAmount: z.string().min(1, "Budget amount is required").transform(val => val),
  period: z.enum(["monthly", "quarterly", "yearly"]),
  budgetType: z.enum(["project", "component"]).default("component"),
  workspaceId: z.number()
}).refine((data) => {
  if (data.budgetType === "component" && !data.componentId) {
    return false;
  }
  return true;
}, {
  message: "Component is required for component budgets",
  path: ["componentId"]
});

const outflowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").transform(val => val),
  componentId: z.number().optional(),
  outflowTypeId: z.number().min(1, "Outflow type is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["pending", "approved", "paid"]),
  workspaceId: z.number()
});

const inflowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").transform(val => val),
  inflowTypeId: z.number().min(1, "Inflow type is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["pending", "received"]),
  invoiceNumber: z.string().optional(),
  workspaceId: z.number()
});

const inflowTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  workspaceId: z.number()
});

const outflowTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  workspaceId: z.number()
});

// Use proper inflow/outflow schemas with type IDs
const expenseSchema = outflowSchema;
const revenueSchema = inflowSchema;

export default function Financials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal states
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Financial modal states
  const [showCreateComponent, setShowCreateComponent] = useState(false);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [showCreateRevenue, setShowCreateRevenue] = useState(false);
  const [showCreateOutflowType, setShowCreateOutflowType] = useState(false);
  const [showCreateInflowType, setShowCreateInflowType] = useState(false);

  // Fetch data
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });

  const { data: projects } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/projects`],
    enabled: !!currentWorkspaceId,
  });

  const { data: categories } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/categories`],
    enabled: !!currentWorkspaceId,
  });

  // Fetch project components
  const { data: components = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/components`],
    enabled: !!selectedProject?.id,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/budgets`],
    enabled: !!selectedProject?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/expenses`],
    enabled: !!selectedProject?.id,
  });

  const { data: revenue = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/revenue`],
    enabled: !!selectedProject?.id,
  });

  // Fetch outflow and inflow types
  const { data: outflowTypes = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/outflow-types`],
    enabled: !!selectedProject?.id,
  });

  const { data: inflowTypes = [] } = useQuery({
    queryKey: [`/api/projects/${selectedProject?.id}/inflow-types`],
    enabled: !!selectedProject?.id,
  });

  // Check URL parameters for project selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    // Get current workspace from localStorage or default to first workspace
    const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    const workspaceId = savedWorkspaceId ? parseInt(savedWorkspaceId) : 
      (Array.isArray(workspaces) && workspaces.length > 0 ? workspaces[0].id : null);
    
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    }

    if (projectId && projects) {
      const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId)) : null;
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects, workspaces]);

  // Update form workspace IDs when currentWorkspaceId changes
  useEffect(() => {
    if (currentWorkspaceId) {
      componentForm.setValue('workspaceId', currentWorkspaceId);
      budgetForm.setValue('workspaceId', currentWorkspaceId);
      expenseForm.setValue('workspaceId', currentWorkspaceId);
      revenueForm.setValue('workspaceId', currentWorkspaceId);
      editBudgetForm.setValue('workspaceId', currentWorkspaceId);
      outflowTypeForm.setValue('workspaceId', currentWorkspaceId);
      inflowTypeForm.setValue('workspaceId', currentWorkspaceId);
    }
  }, [currentWorkspaceId]);

  // Workspace change handler
  const handleWorkspaceChange = (workspaceId: number) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem('currentWorkspaceId', workspaceId.toString());
    setSelectedProject(null);
  };

  // Financial calculations
  const totalBudget = Array.isArray(budgets) ? budgets.reduce((sum: number, budget: any) => sum + parseFloat(budget.budgetAmount || 0), 0) : 0;
  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || 0), 0) : 0;
  const totalRevenue = Array.isArray(revenue) ? revenue.reduce((sum: number, rev: any) => sum + parseFloat(rev.amount || 0), 0) : 0;
  const netProfit = totalRevenue - totalExpenses;
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  // Component mutations
  const createComponentMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/components`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/components`] });
      }
      setShowCreateComponent(false);
      toast({ title: "Component created successfully" });
    },
    onError: (error: any) => {
      console.error("Component creation error:", error);
      toast({ 
        title: "Could not create component", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  // Form mutations
  const createBudgetMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/budgets`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/budgets`] });
      }
      setShowCreateBudget(false);
      toast({ title: "Budget created successfully" });
    },
    onError: (error: any) => {
      console.error("Budget creation error:", error);
      toast({ 
        title: "Could not add budget", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/expenses`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/expenses`] });
      }
      setShowCreateExpense(false);
      toast({ title: "Expense created successfully" });
    },
    onError: (error: any) => {
      console.error("Expense creation error:", error);
      toast({ 
        title: "Could not add expense", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const createRevenueMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/revenue`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/revenue`] });
      }
      setShowCreateRevenue(false);
      toast({ title: "Revenue created successfully" });
    },
    onError: (error: any) => {
      console.error("Revenue creation error:", error);
      toast({ 
        title: "Could not add revenue", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const createOutflowTypeMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/outflow-types`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/outflow-types`] });
      }
      setShowCreateOutflowType(false);
      outflowTypeForm.reset();
      toast({ title: "Outflow type created successfully" });
    },
    onError: (error: any) => {
      console.error("Outflow type creation error:", error);
      toast({ 
        title: "Could not create outflow type", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const createInflowTypeMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) {
        throw new Error("No project selected");
      }
      return apiRequest("POST", `/api/projects/${selectedProject.id}/inflow-types`, data);
    },
    onSuccess: () => {
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject.id}/inflow-types`] });
      }
      setShowCreateInflowType(false);
      inflowTypeForm.reset();
      toast({ title: "Inflow type created successfully" });
    },
    onError: (error: any) => {
      console.error("Inflow type creation error:", error);
      toast({ 
        title: "Could not create inflow type", 
        description: error?.message || "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  // Forms
  const componentForm = useForm({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "milestone" as const,
      status: "active" as const,
      startDate: "",
      endDate: "",
      workspaceId: currentWorkspaceId || 0
    }
  });

  const budgetForm = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      componentId: undefined,
      budgetAmount: "",
      period: "monthly" as const,
      budgetType: "project" as const,
      workspaceId: currentWorkspaceId || 0
    }
  });

  const expenseForm = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: "",
      componentId: 0,
      outflowTypeId: 0,
      date: new Date().toISOString().split('T')[0],
      status: "pending" as const,
      workspaceId: currentWorkspaceId || 0
    }
  });

  const revenueForm = useForm({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: "",
      source: "",
      inflowTypeId: 0,
      date: new Date().toISOString().split('T')[0],
      status: "pending" as const,
      invoiceNumber: "",
      workspaceId: currentWorkspaceId || 0
    }
  });

  const editBudgetForm = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      budgetAmount: "",
      period: "yearly" as const,
      budgetType: "project" as const,
      workspaceId: currentWorkspaceId || 0
    }
  });

  const outflowTypeForm = useForm({
    resolver: zodResolver(outflowTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      workspaceId: currentWorkspaceId || 0
    }
  });

  const inflowTypeForm = useForm({
    resolver: zodResolver(inflowTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      workspaceId: currentWorkspaceId || 0
    }
  });

  // Budget allocation validation
  const calculateBudgetAllocation = () => {
    if (!Array.isArray(budgets) || !Array.isArray(components)) return { 
      totalAllocated: 0, 
      remainingBudget: 0, 
      overAllocated: false,
      totalProjectBudget: 0,
      componentAllocations: [],
      projectBudget: null
    };
    
    // Separate project-level and component-level budgets
    const projectBudgets = budgets.filter((budget: any) => !budget.componentId);
    const componentBudgets = budgets.filter((budget: any) => budget.componentId);
    
    const totalProjectBudget = projectBudgets.reduce((sum, budget) => sum + parseFloat(budget.budgetAmount || 0), 0);
    const componentAllocations = components.map((component: any) => {
      const compBudgets = componentBudgets.filter((budget: any) => budget.componentId === component.id);
      const allocated = compBudgets.reduce((sum, budget) => sum + parseFloat(budget.budgetAmount || 0), 0);
      return { componentId: component.id, componentName: component.name, allocated };
    });
    
    const totalAllocated = componentAllocations.reduce((sum, comp) => sum + comp.allocated, 0);
    const remainingBudget = Math.max(0, totalProjectBudget - totalAllocated);
    const overAllocated = totalAllocated > totalProjectBudget;
    
    return { 
      totalAllocated, 
      remainingBudget, 
      overAllocated, 
      totalProjectBudget, 
      componentAllocations,
      projectBudget: projectBudgets[0] || null
    };
  };

  const budgetAllocation = calculateBudgetAllocation();

  // Effect to populate edit form with existing budget data
  useEffect(() => {
    if (editingBudget && showEditBudget) {
      editBudgetForm.reset({
        budgetAmount: editingBudget.budgetAmount?.toString() || "",
        period: editingBudget.period || "yearly",
        budgetType: "project",
        workspaceId: currentWorkspaceId || 0
      });
    }
  }, [editingBudget, showEditBudget, editBudgetForm, currentWorkspaceId]);

  // Prepare chart data
  const prepareBudgetChartData = () => {
    if (!Array.isArray(budgets) || !Array.isArray(components)) return [];
    return budgetAllocation.componentAllocations.map((allocation, index) => ({
      name: allocation.componentName,
      value: allocation.allocated,
      fill: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
    })).filter(item => item.value > 0);
  };

  const prepareExpenseChartData = () => {
    if (!Array.isArray(expenses) || !Array.isArray(components)) return [];
    const componentExpenses = components.map((component: any) => {
      const componentTotal = expenses
        .filter((expense: any) => expense.componentId === component.id)
        .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      return { name: component.name, value: componentTotal };
    }).filter(item => item.value > 0);
    
    return componentExpenses.map((item, index) => ({
      ...item,
      fill: `hsl(${(index * 137.5 + 60) % 360}, 70%, 50%)`
    }));
  };

  const prepareRevenueChartData = () => {
    if (!Array.isArray(revenue) || !Array.isArray(components)) return [];
    const componentRevenues = components.map((component: any) => {
      const componentTotal = revenue
        .filter((rev: any) => rev.componentId === component.id)
        .reduce((sum, rev) => sum + parseFloat(rev.amount || 0), 0);
      return { name: component.name, value: componentTotal };
    }).filter(item => item.value > 0);
    
    return componentRevenues.map((item, index) => ({
      ...item,
      fill: `hsl(${(index * 137.5 + 120) % 360}, 70%, 50%)`
    }));
  };

  const budgetChartData = prepareBudgetChartData();
  const expenseChartData = prepareExpenseChartData();
  const revenueChartData = prepareRevenueChartData();

  // Form submit handlers
  const onCreateComponent = (data: any) => {
    createComponentMutation.mutate({
      ...data,
      workspaceId: currentWorkspaceId
    });
  };

  const onCreateBudget = (data: any) => {
    const budgetAmount = parseFloat(data.budgetAmount);
    
    // Validation for component budgets
    if (data.budgetType === "component") {
      if (budgetAllocation.totalProjectBudget === 0) {
        toast({
          title: "Project Budget Required",
          description: "Please create a project budget first before allocating to components.",
          variant: "destructive"
        });
        return;
      }
      
      if (budgetAllocation.remainingBudget < budgetAmount) {
        toast({
          title: "Budget Allocation Error",
          description: `This allocation ($${budgetAmount.toFixed(2)}) exceeds the remaining budget ($${budgetAllocation.remainingBudget.toFixed(2)}). Please adjust the amount or increase the project budget.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validation for project budgets - allow creation if no project budget exists
    if (data.budgetType === "project" && budgetAllocation.projectBudget) {
      toast({
        title: "Project Budget Exists",
        description: "A project budget already exists. Please edit the existing budget instead.",
        variant: "destructive"
      });
      return;
    }

    const budgetData: any = {
      ...data,
      budgetAmount: data.budgetAmount,
      workspaceId: currentWorkspaceId
    };

    // For project budgets, remove componentId
    if (data.budgetType === "project") {
      delete budgetData.componentId;
    }

    createBudgetMutation.mutate(budgetData);
  };

  const onCreateExpense = (data: any) => {
    createExpenseMutation.mutate({
      ...data,
      amount: data.amount,  // Keep as string
      workspaceId: currentWorkspaceId
    });
  };

  const onCreateRevenue = (data: any) => {
    createRevenueMutation.mutate({
      ...data,
      amount: data.amount,  // Keep as string
      workspaceId: currentWorkspaceId
    });
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar
          workspaces={Array.isArray(workspaces) ? workspaces : []}
          currentWorkspaceId={currentWorkspaceId}
          onWorkspaceChange={handleWorkspaceChange}
          projects={Array.isArray(projects) ? projects : []}
          categories={Array.isArray(categories) ? categories : []}
          viewMode="home"
          onViewModeChange={(mode) => {
            if (mode === 'home') {
              setLocation(`/workspace/${currentWorkspaceId}`);
            }
          }}
          onProjectFilterChange={() => {}}
          onCreateWorkspace={() => setShowCreateWorkspace(true)}
          onCreateProject={() => setShowCreateProject(true)}
          onCreateCategory={() => setShowCreateCategory(true)}
          onCreateMember={() => setShowAddMember(true)}
          onEditProject={(project) => setEditingProject(project)}
          onEditCategory={(category) => setEditingCategory(category)}
          currentPage="financials"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a Project</h2>
            <p className="text-gray-500">Choose a project from the sidebar to view its financial data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        workspaces={Array.isArray(workspaces) ? workspaces : []}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        projects={Array.isArray(projects) ? projects : []}
        categories={Array.isArray(categories) ? categories : []}
        viewMode="home"
        onViewModeChange={(mode) => {
          if (mode === 'home') {
            setLocation(`/workspace/${currentWorkspaceId}`);
          }
        }}
        onProjectFilterChange={() => {}}
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        onCreateProject={() => setShowCreateProject(true)}
        onCreateCategory={() => setShowCreateCategory(true)}
        onCreateMember={() => setShowAddMember(true)}
        onEditProject={(project) => setEditingProject(project)}
        onEditCategory={(category) => setEditingCategory(category)}
        currentPage="financials"
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Financials</h1>
                <p className="text-sm text-gray-600">{selectedProject.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsDropdown workspaceId={currentWorkspaceId || 0} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="budgets">Budget Setup</TabsTrigger>
              <TabsTrigger value="outflows">Outflow Management</TabsTrigger>
              <TabsTrigger value="inflows">Inflow Tracking</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {budgets.length} budget categories
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {expenses.length} expense entries
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {revenue.length} revenue streams
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    {netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${netProfit.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {netProfit >= 0 ? 'Profit' : 'Loss'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Budget Usage</span>
                      <span>{budgetUtilization.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={budgetUtilization} 
                      className={`w-full ${budgetUtilization > 100 ? 'bg-red-100' : budgetUtilization > 80 ? 'bg-yellow-100' : 'bg-green-100'}`}
                    />
                    <div className="text-sm text-muted-foreground">
                      {budgetUtilization > 100 ? 'Over budget' : 
                       budgetUtilization > 80 ? 'Approaching budget limit' : 
                       'Within budget'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart Summaries */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Distribution by Component */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calculator className="h-4 w-4" />
                      <span>Budget by Component</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {budgetChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={budgetChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {budgetChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${parseFloat(value as string).toFixed(2)}`, 'Budget']} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No budget data</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Expenses Distribution by Component */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4" />
                      <span>Expenses by Component</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenseChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={expenseChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {expenseChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${parseFloat(value as string).toFixed(2)}`, 'Expenses']} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No expense data</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Distribution by Component */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Revenue by Component</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={revenueChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {revenueChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${parseFloat(value as string).toFixed(2)}`, 'Revenue']} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No revenue data</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Setup Tab */}
            <TabsContent value="setup" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Setup & Configuration</h2>
              </div>

              {/* Sub-tabs for different management sections */}
              <Tabs defaultValue="components" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="components">Components</TabsTrigger>
                  <TabsTrigger value="outflow-types">Outflow Types</TabsTrigger>
                  <TabsTrigger value="inflow-types">Inflow Types</TabsTrigger>
                </TabsList>

                {/* Components Management Sub-tab */}
                <TabsContent value="components" className="space-y-4">

              {/* Budget Allocation Alert */}
              {budgetAllocation.overAllocated && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-800">Budget Over-Allocation Warning</h3>
                        <p className="text-sm text-red-700">
                          Component allocations (${budgetAllocation.totalAllocated.toFixed(2)}) exceed total project budget (${budgetAllocation.totalProjectBudget.toFixed(2)}).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Budget Allocation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Allocation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">${budgetAllocation.totalProjectBudget.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Budget</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">${budgetAllocation.totalAllocated.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Allocated</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${budgetAllocation.remainingBudget > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${budgetAllocation.remainingBudget.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={budgetAllocation.totalProjectBudget > 0 ? (budgetAllocation.totalAllocated / budgetAllocation.totalProjectBudget) * 100 : 0} 
                      className={`w-full ${budgetAllocation.overAllocated ? 'bg-red-100' : 'bg-green-100'}`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {budgetAllocation.totalProjectBudget > 0 ? 
                        `${((budgetAllocation.totalAllocated / budgetAllocation.totalProjectBudget) * 100).toFixed(1)}% allocated` : 
                        'No budget set'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <div></div>
                <Dialog open={showCreateComponent} onOpenChange={setShowCreateComponent}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Component
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Component</DialogTitle>
                    </DialogHeader>
                    <Form {...componentForm}>
                      <form onSubmit={componentForm.handleSubmit(onCreateComponent)} className="space-y-4">
                        <FormField
                          control={componentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Component Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., User Authentication, Payment System" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={componentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Brief description of this component..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={componentForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="milestone">Milestone</SelectItem>
                                    <SelectItem value="phase">Phase</SelectItem>
                                    <SelectItem value="section">Section</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={componentForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={componentForm.control}
                          name="budgetAllocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Budget Allocation</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={componentForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={componentForm.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateComponent(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createComponentMutation.isPending}>
                            {createComponentMutation.isPending ? "Creating..." : "Create Component"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {components.map((component: any) => (
                  <Card key={component.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{component.name}</CardTitle>
                        <div className="flex space-x-2">
                          <Badge variant={component.type === 'milestone' ? 'default' : component.type === 'phase' ? 'secondary' : 'outline'}>
                            {component.type}
                          </Badge>
                          <Badge variant={component.status === 'active' ? 'default' : component.status === 'completed' ? 'secondary' : 'destructive'}>
                            {component.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {component.description && (
                        <p className="text-sm text-gray-600 mb-3">{component.description}</p>
                      )}
                      {component.budgetAllocation && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Budget Allocation:</span>
                            <span className="text-sm font-semibold text-green-600">${parseFloat(component.budgetAllocation).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      {(component.startDate || component.endDate) && (
                        <div className="flex space-x-4 text-sm text-gray-500">
                          {component.startDate && (
                            <span>Start: {new Date(component.startDate).toLocaleDateString()}</span>
                          )}
                          {component.endDate && (
                            <span>End: {new Date(component.endDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {components.length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No components created yet.</p>
                        <p className="text-sm">Create components to organize your project finances by milestones or phases.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
                </TabsContent>

                {/* Outflow Types Management Sub-tab */}
                <TabsContent value="outflow-types" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-medium">Outflow Type Categories</h3>
                    <Dialog open={showCreateOutflowType} onOpenChange={setShowCreateOutflowType}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Outflow Type
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Outflow Type</DialogTitle>
                        </DialogHeader>
                        <Form {...outflowTypeForm}>
                          <form onSubmit={outflowTypeForm.handleSubmit((data) => createOutflowTypeMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={outflowTypeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Fuel, Office Supplies" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={outflowTypeForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Brief description of this outflow type" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" disabled={createOutflowTypeMutation.isPending}>
                              {createOutflowTypeMutation.isPending ? "Creating..." : "Create Outflow Type"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid gap-3">
                    {Array.isArray(outflowTypes) && outflowTypes.map((type: any) => (
                      <Card key={type.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{type.name}</h4>
                              {type.description && (
                                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!Array.isArray(outflowTypes) || outflowTypes.length === 0) && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No outflow types configured yet.</p>
                            <p className="text-sm">Add categories like Fuel, Office Supplies, etc.</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Inflow Types Management Sub-tab */}
                <TabsContent value="inflow-types" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-medium">Inflow Type Categories</h3>
                    <Dialog open={showCreateInflowType} onOpenChange={setShowCreateInflowType}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Inflow Type
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Inflow Type</DialogTitle>
                        </DialogHeader>
                        <Form {...inflowTypeForm}>
                          <form onSubmit={inflowTypeForm.handleSubmit((data) => createInflowTypeMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={inflowTypeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Funding, Sale Income" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={inflowTypeForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Brief description of this inflow type" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" disabled={createInflowTypeMutation.isPending}>
                              {createInflowTypeMutation.isPending ? "Creating..." : "Create Inflow Type"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid gap-3">
                    {Array.isArray(inflowTypes) && inflowTypes.map((type: any) => (
                      <Card key={type.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{type.name}</h4>
                              {type.description && (
                                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!Array.isArray(inflowTypes) || inflowTypes.length === 0) && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No inflow types configured yet.</p>
                            <p className="text-sm">Add categories like Funding, Sale Income, etc.</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Budgets Tab */}
            <TabsContent value="budgets" className="space-y-6">
              {/* Budget Allocation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Allocation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">${budgetAllocation.totalProjectBudget.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Budget</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">${budgetAllocation.totalAllocated.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Allocated</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${budgetAllocation.remainingBudget > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${budgetAllocation.remainingBudget.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={budgetAllocation.totalProjectBudget > 0 ? (budgetAllocation.totalAllocated / budgetAllocation.totalProjectBudget) * 100 : 0}
                      className={`w-full ${budgetAllocation.overAllocated ? 'bg-red-100' : 'bg-green-100'}`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {budgetAllocation.totalProjectBudget > 0 ? 
                        `${((budgetAllocation.totalAllocated / budgetAllocation.totalProjectBudget) * 100).toFixed(1)}% allocated` : 
                        'No budget set'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Project Budget Setup</h2>
                <Dialog open={showCreateBudget} onOpenChange={setShowCreateBudget}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Set Project Budget
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Project Budget</DialogTitle>
                    </DialogHeader>
                    <Form {...budgetForm}>
                      <form onSubmit={budgetForm.handleSubmit(onCreateBudget)} className="space-y-4">
                        <FormField
                          control={budgetForm.control}
                          name="budgetType"
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Input {...field} value="project" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {budgetForm.watch("budgetType") === "component" && budgetAllocation.totalProjectBudget === 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <p className="text-sm text-yellow-800">
                                Set a project budget first to allocate funds to components.
                              </p>
                            </div>
                          </div>
                        )}
                        {budgetForm.watch("budgetType") === "component" && budgetAllocation.remainingBudget > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                              Available for allocation: ${budgetAllocation.remainingBudget.toFixed(2)}
                            </p>
                          </div>
                        )}
                        <FormField
                          control={budgetForm.control}
                          name="budgetAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Budget Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={budgetForm.control}
                          name="period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Period</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select period" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateBudget(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createBudgetMutation.isPending}>
                            Create Budget
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {Array.isArray(budgets) && budgets.filter((budget: any) => !budget.componentId).map((budget: any) => (
                  <Card key={budget.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{budget.category}</CardTitle>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{budget.period}</Badge>
                          <Badge variant="secondary">Project Budget</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBudget(budget);
                              setShowEditBudget(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-2">
                        <span>Budget: ${parseFloat(budget.budgetAmount).toFixed(2)}</span>
                        <span>Spent: ${parseFloat(budget.spentAmount || 0).toFixed(2)}</span>
                      </div>
                      <Progress 
                        value={budget.budgetAmount > 0 ? (parseFloat(budget.spentAmount || 0) / parseFloat(budget.budgetAmount)) * 100 : 0} 
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                ))}
                {(!Array.isArray(budgets) || budgets.filter((b: any) => !b.componentId).length === 0) && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500">
                        <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No project budgets set yet.</p>
                        <p className="text-sm">Set up project-level budgets to track overall spending.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Outflows Tab */}
            <TabsContent value="outflows" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Outflow Management</h2>
                <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Outflow
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Outflow</DialogTitle>
                    </DialogHeader>
                    <Form {...expenseForm}>
                      <form onSubmit={expenseForm.handleSubmit(onCreateExpense)} className="space-y-4">
                        <FormField
                          control={expenseForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Expense title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="componentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Component</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : "")} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select component" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {components.map((component: any) => (
                                    <SelectItem key={component.id} value={component.id.toString()}>
                                      {component.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="outflowTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Outflow Type</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : 0)} value={field.value ? field.value.toString() : ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select outflow type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.isArray(outflowTypes) && outflowTypes.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Optional description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateExpense(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createExpenseMutation.isPending}>
                            Create Outflow
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {expenses.map((expense: any) => (
                  <Card key={expense.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{expense.title}</h3>
                          <p className="text-sm text-gray-600">{expense.category}</p>
                          <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                          {expense.description && (
                            <p className="text-sm text-gray-700 mt-2">{expense.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">${parseFloat(expense.amount).toFixed(2)}</div>
                          <Badge variant={expense.status === 'approved' ? 'default' : expense.status === 'pending' ? 'secondary' : 'destructive'}>
                            {expense.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Inflows Tab */}
            <TabsContent value="inflows" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Inflow Tracking</h2>
                <Dialog open={showCreateRevenue} onOpenChange={setShowCreateRevenue}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Inflow
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Inflow</DialogTitle>
                    </DialogHeader>
                    <Form {...revenueForm}>
                      <form onSubmit={revenueForm.handleSubmit(onCreateRevenue)} className="space-y-4">
                        <FormField
                          control={revenueForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Revenue title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source</FormLabel>
                              <FormControl>
                                <Input placeholder="Revenue source" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="inflowTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inflow Type</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : 0)} value={field.value ? field.value.toString() : ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select inflow type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.isArray(inflowTypes) && inflowTypes.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional invoice number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={revenueForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Optional description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateRevenue(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createRevenueMutation.isPending}>
                            Create Inflow
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {revenue.map((rev: any) => (
                  <Card key={rev.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{rev.title}</h3>
                          <p className="text-sm text-gray-600">{rev.source}</p>
                          <p className="text-xs text-gray-500">{new Date(rev.date).toLocaleDateString()}</p>
                          {rev.invoiceNumber && (
                            <p className="text-xs text-gray-500">Invoice: {rev.invoiceNumber}</p>
                          )}
                          {rev.description && (
                            <p className="text-sm text-gray-700 mt-2">{rev.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">${parseFloat(rev.amount).toFixed(2)}</div>
                          <Badge variant={rev.status === 'received' ? 'default' : 'secondary'}>
                            {rev.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {showCreateWorkspace && (
        <CreateWorkspaceModal
          open={showCreateWorkspace}
          onClose={() => setShowCreateWorkspace(false)}
        />
      )}
      {showCreateProject && (
        <CreateProjectModal
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          workspaceId={currentWorkspaceId || 0}
        />
      )}
      {showCreateCategory && (
        <CreateCategoryModal
          open={showCreateCategory}
          onClose={() => setShowCreateCategory(false)}
          workspaceId={currentWorkspaceId || 0}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
          workspaceId={currentWorkspaceId || 0}
        />
      )}
      {editingProject && (
        <EditProjectModal
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={editingProject}
        />
      )}
      {editingCategory && (
        <EditCategoryModal
          open={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          category={editingCategory}
        />
      )}

      {/* Edit Budget Modal */}
      <Dialog open={showEditBudget} onOpenChange={setShowEditBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Budget</DialogTitle>
          </DialogHeader>
          <Form {...editBudgetForm}>
            <form onSubmit={editBudgetForm.handleSubmit(async (data) => {
              try {
                await apiRequest("PATCH", `/api/projects/${selectedProject?.id}/budgets/${editingBudget?.id}`, {
                  ...data,
                  budgetType: "project",
                  workspaceId: currentWorkspaceId
                });
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject?.id}/budgets`] });
                toast({ title: "Budget updated successfully!" });
                setShowEditBudget(false);
                setEditingBudget(null);
                editBudgetForm.reset();
              } catch (error) {
                toast({ title: "Failed to update budget", variant: "destructive" });
              }
            })} className="space-y-4">
              <FormField
                control={editBudgetForm.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="Enter budget amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editBudgetForm.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditBudget(false);
                  setEditingBudget(null);
                  editBudgetForm.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Update Budget</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Widget - Available on all pages */}
      {currentWorkspaceId && <AIAssistantWidget workspaceId={currentWorkspaceId} />}
    </div>
  );
}