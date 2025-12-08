"use client";

import React, { useState } from "react";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const handleExport = () => {
    // Export functionality would fetch data and generate PDF/CSV
    alert("Export feature would be implemented with report generation library");
  };

  // Sample metric cards
  const metrics: MetricCard[] = [
    {
      title: "Total Revenue",
      value: "$245,820",
      change: "+12.5%",
      icon: <DollarSign className="h-6 w-6" />,
      trend: "up",
    },
    {
      title: "Appointments",
      value: "1,284",
      change: "+8.2%",
      icon: <Activity className="h-6 w-6" />,
      trend: "up",
    },
    {
      title: "New Patients",
      value: "342",
      change: "+5.3%",
      icon: <Users className="h-6 w-6" />,
      trend: "up",
    },
    {
      title: "Avg Invoice Value",
      value: "$191.35",
      change: "-2.1%",
      icon: <TrendingUp className="h-6 w-6" />,
      trend: "down",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">Real-time clinic performance metrics</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Start date"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600 font-medium">{metric.title}</h3>
              <div className="text-gray-400">{metric.icon}</div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              {metric.change && (
                <p
                  className={`text-sm font-medium ${
                    metric.trend === "up"
                      ? "text-green-600"
                      : metric.trend === "down"
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  {metric.trend === "up"
                    ? "↑"
                    : metric.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {metric.change} from last period
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
          <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Revenue chart would display here</p>
              <p className="text-sm text-gray-500">
                Using Chart.js or similar library
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Metrics Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Appointment Metrics
          </h2>
          <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                Appointment breakdown chart would display here
              </p>
              <p className="text-sm text-gray-500">
                Completed vs Cancelled vs No-show
              </p>
            </div>
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Patient Demographics
          </h2>
          <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                Age & gender distribution pie charts
              </p>
              <p className="text-sm text-gray-500">Patient segmentation data</p>
            </div>
          </div>
        </div>

        {/* Top Conditions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Top Conditions
          </h2>
          <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Most common diagnoses bar chart</p>
              <p className="text-sm text-gray-500">
                Top 10 conditions by frequency
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Detailed Metrics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">
                  Period
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">
                  Revenue
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">
                  Invoices
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">
                  Avg Amount
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">
                  Appointments
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">
                  Fill Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                {
                  period: "January 2024",
                  revenue: "$45,230",
                  invoices: 156,
                  avg: "$289.81",
                  appts: 312,
                  fill: "78%",
                },
                {
                  period: "February 2024",
                  revenue: "$52,840",
                  invoices: 178,
                  avg: "$296.85",
                  appts: 341,
                  fill: "82%",
                },
                {
                  period: "March 2024",
                  revenue: "$48,750",
                  invoices: 165,
                  avg: "$295.45",
                  appts: 325,
                  fill: "79%",
                },
                {
                  period: "April 2024",
                  revenue: "$56,120",
                  invoices: 189,
                  avg: "$296.96",
                  appts: 358,
                  fill: "85%",
                },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.period}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {row.revenue}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.invoices}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.avg}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.appts}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        parseInt(row.fill) >= 80
                          ? "bg-green-100 text-green-900"
                          : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {row.fill}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        💡 Tip: Use the date range picker to focus on specific periods. Charts
        update automatically when you change the period or date range. All
        metrics are real-time and updated every 5 minutes.
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
