"use client"

import React, { useState, useEffect } from "react"
import {
  Eye,
  EyeOff,
  KeyRound,
  Globe,
  ChevronRight,
  ChevronLeft,
  Server,
  Database,
  Network,
  HardDrive,
  Settings,
  CheckCircle,
  Cloud,
  Link,
  Loader2,
  DollarSign,
  Code,
  Terminal,
  BarChart,
  Lock,
} from "lucide-react"

const CloudWorkflow = () => {
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [formData, setFormData] = useState({
    accessKey: "",
    secretKey: "",
    region: "us-east-1",
    serviceAccountJson: "",
    tenantId: "",
    clientId: "",
    clientSecret: "",
    subscriptionId: "",
  })
  const [showSecret, setShowSecret] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedModules, setSelectedModules] = useState([])
  const [isCreated, setIsCreated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [showIacPreview, setShowIacPreview] = useState(false)
  const [iacCode, setIacCode] = useState("")
  const [deploymentLogs, setDeploymentLogs] = useState([])

  const providers = [
    {
      id: "aws",
      name: "AWS",
      icon: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
      color: "border-yellow-500",
      regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-southeast-1"],
      description: "Amazon Web Services offers reliable, scalable cloud computing services.",
    },
    {
      id: "gcp",
      name: "Google Cloud",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg",
      color: "border-blue-500",
      regions: ["us-central1", "europe-west1", "asia-east1", "australia-southeast1"],
      description: "Google Cloud Platform offers a suite of cloud computing services.",
    },
    {
      id: "azure",
      name: "Azure",
      icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg",
      color: "border-blue-700",
      regions: ["eastus", "westeurope", "southeastasia", "brazilsouth"],
      description: "Microsoft Azure is a cloud computing service for building and managing applications.",
    },
  ]

  const modules = {
    aws: [
      {
        id: "ec2",
        name: "EC2",
        icon: <Server className="text-orange-400" />,
        price: { base: 0.1, storage: 0.08, bandwidth: 0.09 },
        requirements: ["VPC", "Security Group", "IAM Role", "Key Pair"],
        description: "Elastic Compute Cloud provides resizable compute capacity in the cloud.",
        iacResources: ["aws_instance", "aws_security_group", "aws_key_pair"],
      },
      {
        id: "eks",
        name: "EKS",
        icon: <Database className="text-blue-400" />,
        price: { cluster: 0.1, nodes: 0.2, storage: 0.1 },
        requirements: ["VPC", "IAM Role", "Node Group", "Cluster Config"],
        description: "Elastic Kubernetes Service makes it easy to deploy containerized applications.",
        iacResources: ["aws_eks_cluster", "aws_eks_node_group", "aws_iam_role"],
      },
      {
        id: "vpc",
        name: "VPC",
        icon: <Network className="text-green-400" />,
        price: { vpc: 0.01, endpoints: 0.01, natGateway: 0.045 },
        requirements: ["CIDR Block", "Subnets", "Route Tables", "Internet Gateway"],
        description: "Virtual Private Cloud lets you provision a logically isolated section of AWS.",
        iacResources: ["aws_vpc", "aws_subnet", "aws_route_table", "aws_internet_gateway"],
      },
      {
        id: "s3",
        name: "S3",
        icon: <HardDrive className="text-yellow-400" />,
        price: { storage: 0.023, requests: 0.0004, transfer: 0.09 },
        requirements: ["Bucket Name", "Policy", "Encryption Settings", "Access Control"],
        description: "Simple Storage Service offers scalable object storage for data backup and archiving.",
        iacResources: ["aws_s3_bucket", "aws_s3_bucket_policy", "aws_s3_bucket_public_access_block"],
      },
    ],
    gcp: [
      {
        id: "compute",
        name: "Compute Engine",
        icon: <Server className="text-blue-400" />,
        price: { instance: 0.05, storage: 0.04, network: 0.08 },
        requirements: ["VPC", "Firewall Rules", "Service Account", "Disk Config"],
        description: "Compute Engine offers virtual machines running in Google's data centers.",
        iacResources: ["google_compute_instance", "google_compute_disk", "google_compute_firewall"],
      },
      {
        id: "gke",
        name: "GKE",
        icon: <Database className="text-green-400" />,
        price: { cluster: 0.1, nodes: 0.18, storage: 0.04 },
        requirements: ["Cluster Config", "Node Pools", "IAM Permissions", "Network Policy"],
        description: "Google Kubernetes Engine is a managed environment for deploying containerized apps.",
        iacResources: ["google_container_cluster", "google_container_node_pool", "google_service_account"],
      },
      {
        id: "vpc",
        name: "VPC",
        icon: <Network className="text-red-400" />,
        price: { network: 0.01, rules: 0.01, routes: 0.01 },
        requirements: ["CIDR Block", "Subnets", "Firewall Rules", "Routes"],
        description: "Virtual Private Cloud provides networking functionality for cloud-based services.",
        iacResources: ["google_compute_network", "google_compute_subnetwork", "google_compute_firewall"],
      },
      {
        id: "storage",
        name: "Cloud Storage",
        icon: <HardDrive className="text-yellow-400" />,
        price: { storage: 0.02, operations: 0.005, transfer: 0.08 },
        requirements: ["Bucket Name", "Permissions", "Location", "Storage Class"],
        description: "Cloud Storage is a RESTful service for storing and accessing data on Google's infrastructure.",
        iacResources: ["google_storage_bucket", "google_storage_bucket_iam_binding", "google_storage_bucket_object"],
      },
    ],
    azure: [
      {
        id: "vm",
        name: "Virtual Machines",
        icon: <Server className="text-blue-400" />,
        price: { instance: 0.04, storage: 0.05, bandwidth: 0.087 },
        requirements: ["VNet", "Subnet", "NIC", "NSG", "Public IP"],
        description: "Azure Virtual Machines provides on-demand, scalable computing resources.",
        iacResources: ["azurerm_virtual_machine", "azurerm_network_interface", "azurerm_public_ip"],
      },
      {
        id: "aks",
        name: "AKS",
        icon: <Database className="text-green-400" />,
        price: { nodes: 0.1, storage: 0.05, bandwidth: 0.087 },
        requirements: ["Resource Group", "Node Pool", "VNet Integration", "RBAC"],
        description: "Azure Kubernetes Service offers serverless Kubernetes and CI/CD integration.",
        iacResources: ["azurerm_kubernetes_cluster", "azurerm_kubernetes_cluster_node_pool", "azurerm_role_assignment"],
      },
      {
        id: "vnet",
        name: "Virtual Network",
        icon: <Network className="text-purple-400" />,
        price: { vnet: 0.01, gateway: 0.036, peering: 0.01 },
        requirements: ["Address Space", "Subnets", "Route Tables", "NSGs"],
        description: "Azure Virtual Network is the fundamental building block for private networks.",
        iacResources: [
          "azurerm_virtual_network",
          "azurerm_subnet",
          "azurerm_route_table",
          "azurerm_network_security_group",
        ],
      },
      {
        id: "blob",
        name: "Blob Storage",
        icon: <HardDrive className="text-yellow-400" />,
        price: { storage: 0.0184, operations: 0.004, transfer: 0.087 },
        requirements: ["Storage Account", "Access Tier", "Network Rules", "Lifecycle Management"],
        description: "Azure Blob Storage is Microsoft's object storage solution for the cloud.",
        iacResources: ["azurerm_storage_account", "azurerm_storage_container", "azurerm_storage_blob"],
      },
    ],
  }

  const steps = [
    { id: 1, name: "Connection" },
    { id: 2, name: "Modules" },
    { id: 3, name: "Configure" },
    { id: 4, name: "Create" },
  ]

  useEffect(() => {
    if (selectedProvider && currentStep === 3) {
      calculateEstimatedCost()
      generateIaCPreview()
    }
  }, [selectedProvider, selectedModules, currentStep, formData.region])

  const calculateEstimatedCost = () => {
    if (!selectedProvider || selectedModules.length === 0) {
      setEstimatedCost(0)
      return
    }

    let totalCost = 0
    selectedModules.forEach((moduleId) => {
      const module = modules[selectedProvider].find((m) => m.id === moduleId)
      if (module && module.price) {
        // Sum all price components
        totalCost += Object.values(module.price).reduce((sum, price) => sum + price, 0)
      }
    })

    // Apply region-based multiplier
    const regionMultipliers = {
      "us-east-1": 1.0,
      "us-central1": 1.0,
      eastus: 1.0,
      "us-west-2": 1.05,
      "europe-west1": 1.1,
      westeurope: 1.1,
      "eu-central-1": 1.1,
      "asia-east1": 1.15,
      southeastasia: 1.15,
      "ap-southeast-1": 1.15,
      "australia-southeast1": 1.2,
      brazilsouth: 1.2,
    }

    const multiplier = regionMultipliers[formData.region] || 1.0
    totalCost *= multiplier

    // Monthly estimate (730 hours)
    totalCost *= 730

    setEstimatedCost(totalCost)
  }

  const generateIaCPreview = () => {
    if (!selectedProvider || selectedModules.length === 0) {
      setIacCode("")
      return
    }

    let code = ""

    // Provider configuration
    switch (selectedProvider) {
      case "aws":
        code += `# Terraform AWS Provider Configuration
provider "aws" {
  region     = "${formData.region}"
  access_key = "*** sensitive ***"
  secret_key = "*** sensitive ***"
}

`
        break
      case "gcp":
        code += `# Terraform GCP Provider Configuration
provider "google" {
  project     = "your-project-id"
  region      = "${formData.region}"
  credentials = file("service-account.json")
}

`
        break
      case "azure":
        code += `# Terraform Azure Provider Configuration
provider "azurerm" {
  features {}
  subscription_id = "${formData.subscriptionId || "your-subscription-id"}"
  tenant_id       = "${formData.tenantId || "your-tenant-id"}"
  client_id       = "${formData.clientId || "your-client-id"}"
  client_secret   = "*** sensitive ***"
}

`
        break
    }

    // Add resource snippets based on selected modules
    selectedModules.forEach((moduleId) => {
      const module = modules[selectedProvider].find((m) => m.id === moduleId)
      if (module) {
        code += `# ${module.name} Resources\n`
        module.iacResources.forEach((resource) => {
          code += `resource "${resource}" "main" {\n  # Resource configuration will be generated here\n}\n\n`
        })
      }
    })

    setIacCode(code)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleModule = (moduleId) => {
    setSelectedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate deployment process
    const logs = []
    logs.push(`[${new Date().toISOString()}] Starting deployment for ${selectedProvider.toUpperCase()} resources...`)

    setTimeout(() => {
      selectedModules.forEach((moduleId, index) => {
        const module = modules[selectedProvider].find((m) => m.id === moduleId)
        const delay = index * 500

        setTimeout(() => {
          logs.push(`[${new Date().toISOString()}] Initializing ${module.name} deployment...`)
          setDeploymentLogs([...logs])
        }, delay)

        setTimeout(() => {
          logs.push(`[${new Date().toISOString()}] ${module.name} deployed successfully.`)
          setDeploymentLogs([...logs])
        }, delay + 1000)
      })

      setTimeout(() => {
        logs.push(`[${new Date().toISOString()}] All resources deployed successfully!`)
        setDeploymentLogs([...logs])
        setLoading(false)
        setIsCreated(true)
      }, selectedModules.length * 1500)
    }, 1000)
  }

  const selectProvider = (providerId) => {
    const provider = providers.find((p) => p.id === providerId)
    setSelectedProvider(provider.id)
    setFormData({
      ...formData,
      region: provider.regions[0],
    })

    // Simulate fetching connected accounts for AWS
    if (providerId === "aws") {
      setTimeout(() => {
        setConnectedAccounts([
          {
            accountId: "123456789012",
            awsAccessKey: "AKIA************",
            awsSecretKey: "****************************************",
            awsRegion: "us-east-1",
          },
        ])
      }, 500)
    }
  }

  const renderProviderSelection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      {providers.map((provider) => (
        <div
          key={provider.id}
          onClick={() => selectProvider(provider.id)}
          className={`cursor-pointer p-6 bg-[#2A4C83] border-2 ${provider.color} rounded-xl shadow transition duration-200 text-center hover:shadow-lg hover:scale-105`}
        >
          <img
            src={provider.icon || "/placeholder.svg"}
            alt={provider.name}
            className="w-14 h-14 mx-auto mb-3 object-contain"
          />
          <h2 className="text-xl font-semibold text-white">{provider.name}</h2>
          <p className="text-sm text-gray-300 mt-2">{provider.description}</p>
        </div>
      ))}
    </div>
  )

  const renderConnectionForm = () => {
    if (!selectedProvider) return null

    const formFields = {
      aws: (
        <>
          {connectedAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Cloud className="mr-2 text-orange-400" /> Connected Accounts
              </h3>
              <div className="bg-[#1E2633] p-3 rounded-lg border border-[#3a5b9b] mb-4">
                {connectedAccounts.map((account) => (
                  <div key={account.accountId} className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">Account: {account.accountId}</p>
                      <p className="text-xs text-gray-400">Region: {account.awsRegion}</p>
                    </div>
                    <button
                      className="text-xs bg-[#2A4C83] hover:bg-[#3a5b9b] py-1 px-2 rounded"
                      onClick={() => setSelectedAccount(account)}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-orange-400" size={16} /> AWS Access Key
            </label>
            <div className="relative">
              <input
                type="text"
                name="accessKey"
                value={formData.accessKey}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter your AWS Access Key ID from your IAM credentials.</p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-orange-400" size={16} /> AWS Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                name="secretKey"
                value={formData.secretKey}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-3 text-gray-400 hover:text-orange-400"
              >
                {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter your AWS Secret Access Key from your IAM credentials.</p>
          </div>
        </>
      ),
      gcp: (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Lock className="mr-2 text-blue-400" size={16} /> Service Account JSON
          </h3>
          <textarea
            name="serviceAccountJson"
            value={formData.serviceAccountJson}
            onChange={handleChange}
            placeholder="Paste your GCP service account JSON here..."
            rows="6"
            className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Paste the entire JSON file content from your GCP service account key.
          </p>
        </div>
      ),
      azure: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-blue-400" size={16} /> Tenant ID
            </label>
            <input
              type="text"
              name="tenantId"
              value={formData.tenantId}
              onChange={handleChange}
              className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-blue-400" size={16} /> Client ID
            </label>
            <input
              type="text"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-blue-400" size={16} /> Client Secret
            </label>
            <input
              type="password"
              name="clientSecret"
              value={formData.clientSecret}
              onChange={handleChange}
              className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-blue-400" size={16} /> Subscription ID
            </label>
            <input
              type="text"
              name="subscriptionId"
              value={formData.subscriptionId}
              onChange={handleChange}
              className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
              required
            />
          </div>
        </div>
      ),
    }

    return (
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <KeyRound className="mr-2 text-orange-400" /> {selectedProvider.toUpperCase()} Credentials
        </h2>

        {formFields[selectedProvider]}

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 flex items-center">
            <Globe className="mr-2 text-orange-400" size={16} /> Region
          </label>
          <select
            name="region"
            value={formData.region}
            onChange={handleChange}
            className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
          >
            {providers
              .find((p) => p.id === selectedProvider)
              .regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Select the region where your resources will be deployed.</p>
        </div>

        <div className="flex items-center mt-6">
          <button
            type="button"
            onClick={() => {
              setResponseMessage(`✅ Connected to ${selectedProvider.toUpperCase()} successfully!`)
              setTimeout(() => setResponseMessage(""), 3000)
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded transition"
          >
            <Link size={16} /> Test Connection
          </button>
          {responseMessage && <span className="ml-3 text-sm text-green-400">{responseMessage}</span>}
        </div>
      </div>
    )
  }

  const renderModulesStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">Select Modules</h2>
      <p className="text-sm text-gray-300 mb-4">
        Choose the cloud resources you want to deploy. Each module represents a set of related resources.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules[selectedProvider]?.map((module) => (
          <div
            key={module.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedModules.includes(module.id)
                ? "border-orange-500 bg-[#1E2633]"
                : "border-[#3a5b9b] hover:border-orange-300"
            }`}
            onClick={() => toggleModule(module.id)}
          >
            <div className="flex items-center">
              <div className="mr-3">{module.icon}</div>
              <div>
                <h3 className="font-medium">{module.name}</h3>
                <div className="flex items-center mt-1">
                  <DollarSign className="text-green-400" size={14} />
                  <span className="text-xs text-green-400">
                    {Object.entries(module.price).map(
                      ([key, value], i) =>
                        `${key}: $${value}${i < Object.entries(module.price).length - 1 ? ", " : ""}`,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-300 mt-2">{module.description}</p>
            <div className="mt-2">
              <p className="text-xs text-gray-400 font-medium">Requirements:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {module.requirements.map((req, idx) => (
                  <span key={idx} className="text-xs bg-[#1E2633] px-2 py-1 rounded">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderConfigureStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Settings className="mr-2 text-orange-400" /> Configuration Summary
      </h2>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <h3 className="font-medium mb-2">Provider Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">Provider:</div>
          <div>{selectedProvider.toUpperCase()}</div>
          <div className="text-gray-400">Region:</div>
          <div>{formData.region}</div>
          {selectedAccount && (
            <>
              <div className="text-gray-400">Account ID:</div>
              <div>{selectedAccount.accountId}</div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Selected Modules</h3>
          <span className="text-xs text-gray-400">{selectedModules.length} selected</span>
        </div>
        {selectedModules.length > 0 ? (
          <div className="space-y-3">
            {selectedModules.map((moduleId) => {
              const module = modules[selectedProvider].find((m) => m.id === moduleId)
              return (
                <div key={moduleId} className="p-2 bg-[#2A4C83] rounded-lg">
                  <div className="flex items-center">
                    <div className="mr-2">{module?.icon}</div>
                    <div>
                      <h4 className="text-sm font-medium">{module?.name}</h4>
                      <p className="text-xs text-gray-400">{module?.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-300">No modules selected</p>
        )}
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium flex items-center">
            <DollarSign className="mr-1 text-green-400" size={18} /> Estimated Cost
          </h3>
        </div>
        <p className="text-xl font-bold text-green-400">
          ${estimatedCost.toFixed(2)}
          <span className="text-sm font-normal text-gray-300">/month</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Estimated based on standard pricing for the selected region and modules. Actual costs may vary based on usage
          patterns.
        </p>
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium flex items-center">
            <Code className="mr-1 text-orange-400" size={18} /> Infrastructure as Code
          </h3>
          <button
            className="text-xs bg-[#2A4C83] hover:bg-[#3a5b9b] py-1 px-2 rounded"
            onClick={() => setShowIacPreview(!showIacPreview)}
          >
            {showIacPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>

        {showIacPreview && (
          <div className="bg-[#1E2633] p-3 rounded border border-[#3a5b9b] mt-2 max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{iacCode}</pre>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          Preview the Terraform code that will be used to provision your resources. This code can be exported after
          deployment.
        </p>
      </div>
    </div>
  )

  const renderCreateStep = () => (
    <div className="text-center py-4">
      {isCreated ? (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Successfully Created!</h2>
          <p className="text-gray-300 mb-6">Your {selectedProvider.toUpperCase()} resources have been provisioned.</p>

          <div className="mb-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-left flex items-center">
                <Terminal className="mr-2 text-orange-400" /> Deployment Logs
              </h3>
            </div>
            <div className="bg-[#1E2633] p-3 rounded-lg border border-[#3a5b9b] text-left h-40 overflow-y-auto">
              {deploymentLogs.map((log, index) => (
                <div key={index} className="text-xs mb-1 font-mono">
                  {log.includes("successfully") ? (
                    <span className="text-green-400">{log}</span>
                  ) : (
                    <span className="text-gray-300">{log}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-md transition"
            onClick={() => {
              setSelectedProvider(null)
              setCurrentStep(1)
              setIsCreated(false)
              setSelectedModules([])
              setFormData({
                accessKey: "",
                secretKey: "",
                region: "us-east-1",
                serviceAccountJson: "",
                tenantId: "",
                clientId: "",
                clientSecret: "",
                subscriptionId: "",
              })
              setDeploymentLogs([])
            }}
          >
            Start New Deployment
          </button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-4">Ready to Create</h2>
          <p className="text-gray-300 mb-6">Review your configuration and click Create to provision your resources.</p>

          <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center">
                <BarChart className="mr-2 text-orange-400" size={18} /> Deployment Summary
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
                <span className="text-gray-400">Provider</span>
                <span>{selectedProvider.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
                <span className="text-gray-400">Region</span>
                <span>{formData.region}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
                <span className="text-gray-400">Modules</span>
                <span>{selectedModules.length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Est. Monthly Cost</span>
                <span className="text-green-400">${estimatedCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-md transition flex items-center mx-auto"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} /> Deploying...
              </>
            ) : (
              <>Create Resources</>
            )}
          </button>
        </>
      )}
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return selectedProvider ? renderConnectionForm() : renderProviderSelection()
      case 2:
        return renderModulesStep()
      case 3:
        return renderConfigureStep()
      case 4:
        return renderCreateStep()
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 bg-[#1E2633] text-white">
      <div className="max-w-4xl mx-auto">
        {selectedProvider && (
          <>
            <h1 className="text-2xl font-bold mb-2">{selectedProvider.toUpperCase()} Cloud Workflow</h1>
            <p className="mb-8 text-gray-300">
              {currentStep === 1 && "Connect to your account by providing your credentials."}
              {currentStep === 2 && "Select modules to deploy in your cloud environment."}
              {currentStep === 3 && "Review your configuration before creating resources."}
              {currentStep === 4 && !isCreated && "Ready to create your cloud resources."}
              {currentStep === 4 && isCreated && "Your deployment was successful!"}
            </p>

            <div className="flex items-center justify-between mb-10">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        currentStep >= step.id ? "bg-[#F26A2E]" : "bg-[#2A4C83]"
                      }`}
                    >
                      {step.id}
                    </div>
                    <span className="text-sm mt-2">{step.name}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 bg-[#2A4C83] relative">
                      {currentStep > step.id && (
                        <div className="absolute top-0 left-0 h-full w-full bg-[#F26A2E]"></div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </>
        )}

        <div className="bg-[#2A4C83] p-6 rounded-lg border border-[#3a5b9b]">
          {renderStepContent()}

          {selectedProvider && currentStep !== 4 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
                className={`flex items-center py-2 px-4 rounded-md ${
                  currentStep === 1 ? "bg-gray-600 cursor-not-allowed" : "bg-[#1E2633] hover:bg-[#3a5b9b]"
                }`}
              >
                <ChevronLeft className="mr-1" /> Back
              </button>

              <button
                onClick={() => currentStep < 4 && setCurrentStep(currentStep + 1)}
                disabled={currentStep === 2 && selectedModules.length === 0}
                className={`flex items-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition ${
                  currentStep === 2 && selectedModules.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {currentStep < 3 ? "Continue" : "Review"} <ChevronRight className="ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CloudWorkflow
