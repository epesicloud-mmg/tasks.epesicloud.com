import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, 
  CheckSquare, 
  DollarSign, 
  FileText, 
  Users, 
  Zap,
  Calendar,
  MessageSquare,
  FolderOpen,
  Target
} from "lucide-react";

export default function Landing() {
  const { isLoading } = useAuth();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TasksAI</span>
            </div>
            <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            AI-First Project Management
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            The All-in-One{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              AI-Powered
            </span>{" "}
            Workspace
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Combine project execution, financial monitoring, and knowledge management 
            in workspace-isolated environments with intelligent AI assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary/90">
              Start Your Free Workspace
            </Button>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Three Management Layers, One Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Revolutionary workspace-based solution that reimagines project management 
            through intelligent integration and AI-native design.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Execute</CardTitle>
              <CardDescription>Tasks Management</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Plan and track all project deliverables</li>
                <li>• Monitor progress and deadlines</li>
                <li>• Coordinate team efforts with intelligent automation</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Monitor</CardTitle>
              <CardDescription>Financial Management</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Track project budgets with predictive analytics</li>
                <li>• Monitor profitability and ROI in real-time</li>
                <li>• Handle client billing and automated reporting</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Document</CardTitle>
              <CardDescription>Knowledge Management</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Capture all project knowledge in living docs</li>
                <li>• Build institutional memory with AI insights</li>
                <li>• Create evolving best practices and optimization</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Multiple View Modes</span>
          </div>
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">AI Chat Assistant</span>
          </div>
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Team Collaboration</span>
          </div>
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">File Vault</span>
          </div>
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Project Chat</span>
          </div>
          <div className="flex items-center space-x-3">
            <Target className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Brain Dump</span>
          </div>
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Time Tracking</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Smart Automation</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-secondary py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of teams using AI-powered project management to achieve more.
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            variant="secondary"
            className="bg-white text-primary hover:bg-gray-100"
          >
            Start Your Free Workspace
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">TasksAI</span>
          </div>
          <p className="text-center text-gray-600 mt-4">
            © 2025 TasksAI. Built for the future of work.
          </p>
        </div>
      </footer>
    </div>
  );
}
