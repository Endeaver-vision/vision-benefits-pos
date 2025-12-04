"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Users, Zap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">VisionPOS</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle variant="pill" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-20">
            <Badge variant="glass" size="lg" className="mb-6">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Vision Benefits
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Vision Benefits
              <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                Point of Sale
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Streamline your optical practice with intelligent insurance verification,
              quote building, and customer management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="xl">
                  Sign In
                </Button>
              </Link>
              <Link href="/quote-builder">
                <Button variant="glass" size="xl">
                  Start New Quote
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Smart Quotes</CardTitle>
                <CardDescription>
                  Build accurate quotes with real-time insurance verification and benefit calculations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Track customer history, preferences, and insurance information in one place.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Insurance Scanner</CardTitle>
                <CardDescription>
                  Scan and extract insurance card data automatically using AI technology.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Chip Buttons Demo */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button className="chip chip-blue">New Quote</button>
              <button className="chip chip-green">Verify Insurance</button>
              <button className="chip chip-purple">Scan Card</button>
              <button className="chip chip-orange">View Reports</button>
              <button className="chip chip-teal">Customers</button>
              <button className="chip chip-glass">Settings</button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>Vision Benefits Point of Sale System</p>
        </div>
      </footer>
    </div>
  );
}
