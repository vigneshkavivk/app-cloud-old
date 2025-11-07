//app-cloud\app-cloudmasa\client\src\components\WorkFlow.jsx
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

const API_BASE = 'http://3.216.109.221:3000';

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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedModules, setSelectedModules] = useState([])
  const [isCreated, setIsCreated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [moduleValid, setModuleValid] = useState(false)
  const [vpcs, setVpcs] = useState([])
  const [usingExistingAccount, setUsingExistingAccount] = useState(false)
  const [formValid, setFormValid] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [dynamicPricing, setDynamicPricing] = useState({});
  const [showIacPreview, setShowIacPreview] = useState(false)
  const [moduleConfig, setModuleConfig] = useState({})
  const [iacCode, setIacCode] = useState("")
  const [deploymentLogs, setDeploymentLogs] = useState([])

  const fetchVpcs = async () => {
    if (!selectedAccount || selectedProvider !== "aws") return;
    try {
      const response = await fetch(`${API_BASE}/api/aws/get-vpcs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user'))?.token || ''}` // âœ… ADD THIS LINE
        },
        body: JSON.stringify({
          accountId: selectedAccount._id
        })
      });
      const data = await response.json();
      if (data.success) {
        setVpcs(data.vpcs);
      } else {
        console.error('Error fetching VPCs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching VPCs:', error);
    }
  };

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
        iacResources: [
          "aws_instance",
          "aws_security_group",
          "aws_key_pair",
          "aws_iam_role",
          "aws_iam_instance_profile",
          "aws_iam_role_policy_attachment"
        ],
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
      {
      id: "lambda",
      name: "Lambda",
      icon: <Code className="text-purple-400" />,
      price: { requests: 0.0000002, duration: 0.0000166667 },
      requirements: ["IAM Role", "Function Code", "Runtime", "Memory Config"],
      description: "Serverless compute service that runs code without provisioning or managing servers.",
      iacResources: ["aws_lambda_function", "aws_iam_role", "aws_lambda_permission"],
    },
    {
      id: "dynamodb",
      name: "DynamoDB",
      icon: <Database className="text-blue-400" />,
      price: { read: 0.25, write: 1.25, storage: 0.25 },
      requirements: ["Table Name", "Primary Key", "Billing Mode", "Attributes"],
      description: "Fully managed NoSQL database service for fast and predictable performance.",
      iacResources: ["aws_dynamodb_table", "aws_dynamodb_global_table"],
    },
    {
      id: "cloudfront",
      name: "CloudFront",
      icon: <Globe className="text-teal-400" />,
      price: { dataOut: 0.085, requests: 0.0075 },
      requirements: ["Origin", "Distribution", "Cache Behavior", "SSL Certificate"],
      description: "Content Delivery Network that securely delivers data with low latency and high speed.",
      iacResources: ["aws_cloudfront_distribution", "aws_cloudfront_origin_access_identity"],
    },
    {
      id: "iam",
      name: "IAM",
      icon: <Lock className="text-gray-400" />,
      price: { free: 0 }, // Free tier, but kept as object for consistency
      requirements: ["Users", "Roles", "Policies", "Access Keys"],
      description: "Identity and Access Management controls user access to AWS resources securely.",
      iacResources: ["aws_iam_user", "aws_iam_role", "aws_iam_policy", "aws_iam_access_key"],
    },
    {
      id: "sns",
      name: "SNS",
      icon: <Terminal className="text-pink-400" />,
      price: { publish: 0.5 / 1e6, sms: 0.00645 }, // $0.50 per million = $0.0000005 per request
      requirements: ["Topic", "Subscriptions", "Message Format", "Permissions"],
      description: "Simple Notification Service sends messages to multiple subscribers and endpoints.",
      iacResources: ["aws_sns_topic", "aws_sns_topic_subscription"],
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
    if (selectedProvider === "aws") {
      // If using existing account
      if (usingExistingAccount && selectedAccount) {
        setFormValid(true)
      }
      // If using new credentials
      else if (!usingExistingAccount && formData.accessKey && formData.secretKey && formData.region) {
        setFormValid(true)
      }
      // Invalid state
      else {
        setFormValid(false)
      }
    } else {
      // For GCP and Azure, just check region
      setFormValid(formData.region ? true : false)
    }
  }, [selectedProvider, usingExistingAccount, selectedAccount, formData.accessKey, formData.secretKey, formData.region])

  useEffect(() => {
    if (selectedAccount && selectedProvider === "aws") {
      fetchVpcs();
    } else {
      setVpcs([]);
    }
  }, [selectedAccount, selectedProvider])

  useEffect(() => {
    if (selectedProvider === "aws" && currentStep === 3 && formData.region) {
      const fetchPricing = async () => {
        try {
          const token = JSON.parse(localStorage.getItem('user'))?.token || '';
          const res = await fetch(`${API_BASE}/api/aws/get-pricing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              region: formData.region,
              modules: selectedModules
            })
          });
          const data = await res.json();
          if (data.success) {
            setDynamicPricing(data.pricing); // e.g., { ec2: {...}, s3: {...} }
          } else {
            console.error("Failed to fetch pricing:", data.error);
            setDynamicPricing({});
          }
        } catch (err) {
          console.error("Pricing fetch error:", err);
          setDynamicPricing({});
        }
      };
      fetchPricing();
    }
  }, [selectedProvider, currentStep, formData.region, selectedModules]);

  useEffect(() => {
    if (selectedProvider && selectedModules.length > 0) {
      const moduleId = selectedModules[0]; // Get the single selected module
      const module = modules[selectedProvider].find(m => m.id === moduleId);
      const config = moduleConfig[moduleId] || {};

      let isValid = false;

      if (moduleId === "ec2") {
        isValid = config.name && config.instanceType && config.vpcId;
      } else if (moduleId === "s3") {
        isValid = config.name && config.storageClass;
      } else if (moduleId === "vpc") {
        isValid = config.name && config.cidrBlock;
      } else if (moduleId === "eks") {
        isValid = config.clusterName && config.nodeCount && config.instanceType;
      } else {
        // For other modules, consider them valid if they are selected (since we don't have specific validation rules)
        isValid = true;
      }

      setModuleValid(isValid);
    } else {
      setModuleValid(false); // No module selected
    }
  }, [selectedProvider, selectedModules, moduleConfig]);

useEffect(() => {
  if (selectedProvider && currentStep === 3) {
    calculateEstimatedCost();
    generateIaCPreview();
  }
}, [selectedProvider, selectedModules, currentStep, formData.region, moduleConfig]);

  const calculateEstimatedCost = () => {
    if (!selectedProvider || selectedModules.length === 0) {
      setEstimatedCost(0);
      return;
    }
    let totalCost = 0;
    selectedModules.forEach((moduleId) => {
      const config = moduleConfig[moduleId] || {};
      if (dynamicPricing[moduleId]) {
        // ✅ Use LIVE pricing from AWS API
        if (moduleId === "ec2") {
          const instanceType = config.instanceType || "t2.micro";
          const hourlyPrice = dynamicPricing.ec2[instanceType] || 0; // If not found, default to 0
          totalCost += hourlyPrice * 730; // 730 hours/month
        } else if (moduleId === "s3") {
          const storageClass = config.storageClass || "STANDARD";
          const hourlyPrice = dynamicPricing.s3[storageClass] || 0;
          totalCost += hourlyPrice * 730;
        } else if (moduleId === "vpc") {
          // VPC itself is free, but NAT Gateway has cost
          const natGatewayHourlyPrice = dynamicPricing.vpc?.natGateway || 0;
          totalCost += natGatewayHourlyPrice * 730;
        }
        // Add other modules as needed (e.g., lambda, dynamodb)
      } else {
        // ❌ Fallback: Use hardcoded prices only if API fails
        const module = modules[selectedProvider].find(m => m.id === moduleId);
        if (module && module.price) {
          totalCost += Object.values(module.price).reduce((sum, p) => sum + p, 0) * 730;
        }
      }
    });
    setEstimatedCost(totalCost); // ✅ This updates the state that feeds into the UI
  };

  const generateIaCPreview = () => {
    if (!selectedProvider || selectedModules.length === 0) {
      setIacCode("");
      return;
    }

    let code = "";
    switch (selectedProvider) {
      case "aws":
        code += `# Terraform AWS Provider Configuration
provider "aws" {
  region     = "${formData.region}"
  access_key = "*** sensitive ***"
  secret_key = "*** sensitive ***"
}
`;
        break;
      case "gcp":
        code += `# Terraform GCP Provider Configuration
provider "google" {
  project     = "your-project-id"
  region      = "${formData.region}"
  credentials = file("service-account.json")
}
`;
        break;
      case "azure":
        code += `# Terraform Azure Provider Configuration
provider "azurerm" {
  features {}
  subscription_id = "${formData.subscriptionId || "your-subscription-id"}"
  tenant_id       = "${formData.tenantId || "your-tenant-id"}"
  client_id       = "${formData.clientId || "your-client-id"}"
  client_secret   = "*** sensitive ***"
}
`;
        break;
    }

    selectedModules.forEach((moduleId) => {
      const module = modules[selectedProvider].find((m) => m.id === moduleId);
      if (module) {
        code += `# ${module.name} Resources
`;
        const config = moduleConfig[moduleId] || {};
        module.iacResources.forEach((resource) => {
          code += `resource "${resource}" "${config.name || moduleId}" {
`;
          if (moduleId === "ec2") {
            code += `  instance_type = "${config.instanceType || "t2.micro"}"
`;
            if (config.amiId) code += `  ami = "${config.amiId}"
`;
            // Add VPC reference
            if (config.vpcId === "default") {
              code += `  # Uses default VPC
`;
            } else if (config.vpcId === "use-selected-vpc" && selectedModules.includes("vpc")) {
              code += `  subnet_id = aws_subnet.${moduleConfig.vpc?.name || "main"}.id
`;
            }
          } else if (moduleId === "s3") {
            code += `  bucket = "${config.bucketName || "my-bucket"}"
`;
            code += `  force_destroy = true
`;
          } else if (moduleId === "dynamodb") {
              code += `  name = "${config.tableName || "my-dynamodb-table"}"
            `;
              code += `  tags = {
                Environment = "${config.environment || "prod"}"
              }
`;
          } else if (moduleId === "vpc") {
            const cidr = config.cidrBlock || "10.0.0.0/16";
            const subnetCount = config.subnetCount || 2;
            const publicSubnets = [];
            const privateSubnets = [];
            for (let i = 0; i < Math.ceil(subnetCount / 2); i++) {
              publicSubnets.push(`"10.0.${i + 1}.0/24"`);
              privateSubnets.push(`"10.0.${i + 1 + Math.ceil(subnetCount / 2)}.0/24"`);
            }
            code += `  project_name           = "${config.name || "cloudmasa-vpc"}"
            vpc_cidr               = "${cidr}"
            public_subnet_cidrs    = [${publicSubnets.join(", ")}]
            private_subnet_cidrs   = [${privateSubnets.join(", ")}]
          `;
          } else if (moduleId === "eks") {
            code += `  name = "${config.clusterName || "my-eks-cluster"}"
`;
          }
          code += `}
`;
        });
      }
    });

    setIacCode(code);
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleModule = (moduleId) => {
    // Set selectedModules to an array containing ONLY the clicked moduleId
    setSelectedModules([moduleId]);

    // Update moduleConfig: clear all other configs, keep only the config for the newly selected module
    const newConfig = {};
    if (!moduleConfig[moduleId]) {
      // Initialize config for the newly selected module
      newConfig[moduleId] = {
        name: "",
        region: formData.region,
        ...(moduleId === "ec2" && { instanceType: "t2.micro", amiId: "", vpcId: "" }),
        ...(moduleId === "s3" && { bucketName: "", storageClass: "STANDARD" }),
        ...(moduleId === "vpc" && { cidrBlock: "10.0.0.0/16", subnetCount: 2 }),
        ...(moduleId === "eks" && { clusterName: "", nodeCount: 2, instanceType: "t3.medium" })
      };
    } else {
      // Keep the existing config for the selected module
      newConfig[moduleId] = moduleConfig[moduleId];
    }
    setModuleConfig(newConfig);
  };
  

  const renderModuleConfigForm = (moduleId) => {
    const module = modules[selectedProvider].find(m => m.id === moduleId);
    if (!module) return null;
    const config = moduleConfig[moduleId] || {};

    return (
      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <span className="mr-2">{module.icon}</span>
          Configure {module.name}
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Resource Name</label>
          <input
            type="text"
            value={config.name || ""}
            onChange={(e) => setModuleConfig({
              ...moduleConfig,
              [moduleId]: { ...config, name: e.target.value }
            })}
            placeholder={`Enter ${module.name} name`}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
          />
        </div>
        {moduleId === "dynamodb" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Environment Tag</label>
              <select
                value={config.environment || "prod"}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, environment: e.target.value }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
              </select>
            </div>
          </>
        )}
                
        {moduleId === "ec2" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Instance Type</label>
              <select
                value={config.instanceType || "t2.micro"}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, instanceType: e.target.value }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="t2.micro">t2.micro</option>
                <option value="t2.small">t2.small</option>
                <option value="t2.medium">t2.medium</option>
                <option value="m5.large">m5.large</option>
                <option value="t3.medium">t3.medium</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">AMI ID</label>
              <input
                type="text"
                value={config.amiId || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, amiId: e.target.value }
                })}
                placeholder="ami-0abcdef1234567890"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
            </div>
            {/* ADD VPC SELECTION */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">VPC</label>
              <select
                value={config.vpcId || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, vpcId: e.target.value }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="">-- Select VPC --</option>
                <option value="default">Use Default VPC</option>
                {vpcs.map(vpc => (
                  <option key={vpc.id} value={vpc.id}>
                    {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
                  </option>
                ))}
                {selectedModules.includes("vpc") && (
                  <option value="use-selected-vpc">Use Selected VPC Module</option>
                )}
              </select>
            </div>
          </>
        )}

        {moduleId === "s3" && (
          <>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Storage Class</label>
              <select
                value={config.storageClass || "STANDARD"}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, storageClass: e.target.value }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="STANDARD">Standard</option>
                <option value="INTELLIGENT_TIERING">Intelligent Tiering</option>
                <option value="GLACIER">Glacier</option>
              </select>
            </div>
          </>
        )}

        {moduleId === "vpc" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">CIDR Block</label>
              <input
                type="text"
                value={config.cidrBlock || "10.0.0.0/16"}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, cidrBlock: e.target.value }
                })}
                placeholder="10.0.0.0/16"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Number of Subnets</label>
              <select
                value={config.subnetCount || 2}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, subnetCount: parseInt(e.target.value) }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
          </>
        )}

        {moduleId === "eks" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Cluster Name</label>
              <input
                type="text"
                value={config.clusterName || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, clusterName: e.target.value }
                })}
                placeholder="my-eks-cluster"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Public Subnet CIDRs</label>
              <input
                type="text"
                value={config.publicSubnetCidrs?.join(', ') || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: {
                    ...config,
                    publicSubnetCidrs: e.target.value.split(',').map(s => s.trim())
                  }
                })}
                placeholder="10.0.1.0/24, 10.0.2.0/24"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated list of CIDR blocks</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Private Subnet CIDRs</label>
              <input
                type="text"
                value={config.privateSubnetCidrs?.join(', ') || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: {
                    ...config,
                    privateSubnetCidrs: e.target.value.split(',').map(s => s.trim())
                  }
                })}
                placeholder="10.0.3.0/24, 10.0.4.0/24"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated list of CIDR blocks</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Private Subnet CIDRs</label>
              <input
                type="text"
                value={config.privateSubnetCidrs?.join(', ') || ""}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: {
                    ...config,
                    privateSubnetCidrs: e.target.value.split(',').map(s => s.trim())
                  }
                })}
                placeholder="10.0.3.0/24, 10.0.4.0/24"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated list of CIDR blocks</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Node Count</label>
              <select
                value={config.nodeCount || 2}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, nodeCount: parseInt(e.target.value) }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Instance Type</label>
              <select
                value={config.instanceType || "t3.medium"}
                onChange={(e) => setModuleConfig({
                  ...moduleConfig,
                  [moduleId]: { ...config, instanceType: e.target.value }
                })}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
              >
                <option value="t3.medium">t3.medium</option>
                <option value="t3.large">t3.large</option>
                <option value="m5.large">m5.large</option>
                <option value="c5.xlarge">c5.xlarge</option>
              </select>
            </div>
          </>
        )}
      </div>
    );
  }

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setDeploymentLogs([]);
  setIsCreated(false);

  const getAuthToken = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '';
    try {
      return JSON.parse(userStr).token || '';
    } catch {
      return '';
    }
  };

  // Get token from localStorage for auth
  const userStr = localStorage.getItem('user');
  const token = JSON.parse(localStorage.getItem('user'))?.token || '';

  const payload = {
    provider: selectedProvider,
    region: formData.region,
    modules: selectedModules,
    moduleConfig: moduleConfig,
    account: selectedAccount,
    credentials: {
      accessKey: formData.accessKey,
      secretKey: formData.secretKey,
      serviceAccountJson: formData.serviceAccountJson,
      tenantId: formData.tenantId,
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      subscriptionId: formData.subscriptionId
    }
  };

  try {
    // ✅ Call REAL DEPLOY endpoint (not just generate)
    const deployRes = await fetch(`${API_BASE}/api/terraform/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ✅ Required for auth
      },
      body: JSON.stringify(payload),
    });

    const result = await deployRes.json();

    if (!result.success) {
      setDeploymentLogs([`❌ Deploy failed: ${result.error}`]);
      setLoading(false);
      return;
    }

    const deploymentId = result.deploymentId;

    // ✅ Poll logs every 1 second
    const pollLogs = async () => {
      try {
        const logRes = await fetch(`${API_BASE}/api/terraform/logs/${deploymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` } // ✅ Auth for logs too
        });
        const logs = await logRes.text();
        const logLines = logs
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${line}`);

        setDeploymentLogs(logLines);

        // Stop when done
        if (logs.includes('Apply complete') || logs.includes('Error')) {
          setIsCreated(true);
          setLoading(false);
        } else {
          setTimeout(pollLogs, 1000);
        }
      } catch (err) {
        console.error('Log poll error:', err);
        setTimeout(pollLogs, 2000);
      }
    };

    pollLogs();

  } catch (error) {
    setDeploymentLogs([`❌ Network error: ${error.message}`]);
    setLoading(false);
  }
};
  const selectProvider = (providerId) => {
    const provider = providers.find((p) => p.id === providerId);
    setSelectedProvider(provider.id);
    setFormData({
      ...formData,
      region: provider.regions[0],
    });
    // Fetch real connected accounts from backend - CORRECT PATH
    if (providerId === "aws") {
      fetch(`${API_BASE}/api/aws/get-aws-accounts`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user'))?.token || ''}` // âœ… ADD THIS LINE
        }
      })
      .then(res => res.json())
      .then(accounts => {
        setConnectedAccounts(accounts);
          if (accounts.length > 0 && !selectedAccount) {
            // Optionally auto-select the first account
            setSelectedAccount(accounts[0]);
            setUsingExistingAccount(true);
            setFormData(prev => ({ ...prev, region: accounts[0].awsRegion }));
          }
        })
        .catch(err => {
          console.error('Failed to fetch connected AWS accounts:', err);
          setConnectedAccounts([]);
        });
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
              <select
                value={selectedAccount ? selectedAccount._id : ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setSelectedAccount(null);
                    setUsingExistingAccount(false);
                  } else {
                    const selected = connectedAccounts.find(acc => acc._id === e.target.value);
                    if (selected) {
                      setSelectedAccount(selected);
                      setFormData({...formData, region: selected.awsRegion});
                      setUsingExistingAccount(true);
                    }
                  }
                }}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
              >
                <option value="">-- Select an Account --</option>
                {connectedAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    Account: {account.accountId} (Region: {account.awsRegion})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select an existing AWS account to use.</p>
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
                disabled={usingExistingAccount}
                className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
                  usingExistingAccount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                required={!usingExistingAccount}
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
                disabled={usingExistingAccount}
                className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
                  usingExistingAccount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                required={!usingExistingAccount}
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
            disabled={usingExistingAccount} // ✅ Add this line
            className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
              usingExistingAccount ? 'opacity-50 cursor-not-allowed' : '' // ✅ Add this line
            }`}
          >
            {providers
              .find((p) => p.id === selectedProvider)
              .regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Select the region where your resources will be deployed.
            {usingExistingAccount && " (Disabled because an existing account is selected)"}
          </p>
        </div>

        <div className="flex items-center mt-6 gap-3">
          <button
            type="button"
            onClick={async () => {
              if (selectedProvider !== "aws") return;
              // Get token from localStorage (or your auth system)
              const token = JSON.parse(localStorage.getItem('user'))?.token || '';
              const res = await fetch(`${API_BASE}/api/aws/validate-credentials`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` // âœ… This line was missing or commented out
                },
                body: JSON.stringify({
                  accessKeyId: formData.accessKey,
                  secretAccessKey: formData.secretKey,
                  region: formData.region
                })
              });
              const data = await res.json();
              setResponseMessage(data.valid ? '✅ Connection successful!' : `❌ ${data.error}`);
              setTimeout(() => setResponseMessage(""), 3000);
            }}
            disabled={usingExistingAccount} // ✅ Add this line
            className={`flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded transition ${
              usingExistingAccount ? 'opacity-50 cursor-not-allowed' : '' // ✅ Add this line
            }`}
          >
            <Link size={16} /> Test Connection
          </button>

          {formData.accessKey && formData.secretKey && !usingExistingAccount && (
            <button
              type="button"
              onClick={async () => {
                if (selectedProvider !== "aws") return;
                const token = JSON.parse(localStorage.getItem('user'))?.token || '';
                const res = await fetch(`${API_BASE}/api/aws/connect-to-aws`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    accessKeyId: formData.accessKey,
                    secretAccessKey: formData.secretKey,
                    region: formData.region
                  })
                });
                const data = await res.json();

                // ✅ ALWAYS refresh accounts first (whether success or duplicate)
                const accountsRes = await fetch('/api/aws/get-aws-accounts', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const freshAccounts = await accountsRes.json();
                setConnectedAccounts(freshAccounts);

                if (data.success) {
                  setResponseMessage('✅ Account saved successfully!');
                  if (freshAccounts.length > 0) {
                    setSelectedAccount(freshAccounts[0]);
                    setUsingExistingAccount(true);
                    setFormData(prev => ({ ...prev, region: freshAccounts[0].awsRegion }));
                  }
                } else if (data.error && data.existingAccountId) {
                  // ✅ Now search in FRESH accounts
                  const existingAccount = freshAccounts.find(acc => acc._id === data.existingAccountId);
                  if (existingAccount) {
                    setSelectedAccount(existingAccount);
                    setUsingExistingAccount(true);
                    setFormData(prev => ({ ...prev, region: existingAccount.awsRegion }));
                    setResponseMessage('⚠️ This AWS account is already connected!');
                  } else {
                    setResponseMessage('❌ Account not found.');
                  }
                } else {
                  setResponseMessage(`❌ ${data.error}`);
                }
                setTimeout(() => setResponseMessage(""), 3000);
              }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition"
            >
              <CheckCircle size={16} /> Connect Account
            </button>
          )}
          {responseMessage && <span className="ml-3 text-sm text-green-400">{responseMessage}</span>}
        </div>
      </div>
    )
  }

  const renderModulesStep = () => {
    // const [searchQuery, setSearchQuery] = useState("");

    const filteredModules = modules[selectedProvider]?.filter((module) =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">Select Modules</h2>
        <p className="text-sm text-gray-300 mb-4">
          Choose the cloud resources you want to deploy. Each module represents a set of related resources.
        </p>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-2 text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 pr-2">
          {filteredModules?.map((module) => (
            <div
              key={module.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedModules.length > 0 && selectedModules[0] === module.id
                  ? "border-orange-500 bg-[#1E2633]"
                  : "border-[#3a5b9b] hover:border-orange-300"
              }`}
              onClick={() => toggleModule(module.id)}
            >
              <div className="flex items-start mb-3">
                <div className="mr-3 mt-1">{module.icon}</div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{module.name}</h3>
                  <div className="flex items-center mt-1 text-xs text-green-400">
                    <DollarSign className="mr-1" size={14} />
                    {dynamicPricing[module.id] ? (
                      (() => {
                        const prices = Object.values(dynamicPricing[module.id]).filter(p => p > 0);
                        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                        return `from $${minPrice.toFixed(5)}/hr`;
                      })()
                    ) : (
                      (() => {
                        const prices = Object.values(module.price).filter(p => p > 0);
                        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                        return `from $${minPrice}/hr`;
                      })()
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-3">{module.description}</p>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Requirements:</p>
                <div className="flex flex-wrap gap-1">
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

        {selectedModules.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Module Configuration</h3> {/* Changed from "Module Configurations" */}
            {selectedModules.map((moduleId) => (
              <div key={moduleId}>
                {renderModuleConfigForm(moduleId)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
          ${estimatedCost.toFixed(2)} {/* ✅ This is where the LIVE cost appears */}
          <span className="text-sm font-normal text-gray-300">/month</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Estimated based on standard pricing for the selected region and modules. Actual costs may vary based on usage patterns.
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
          Preview the Terraform code that will be used to provision your resources. This code can be exported after deployment.
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
                onClick={() => {
                  if (currentStep === 1) {
                    // Step 1 validation: AWS account or credentials required
                    if (selectedProvider === "aws") {
                      if ((usingExistingAccount && selectedAccount) ||
                          (!usingExistingAccount && formData.accessKey && formData.secretKey && formData.region)) {
                        setCurrentStep(2);
                      }
                    } else {
                      // GCP/Azure: just need region
                      if (formData.region) {
                        setCurrentStep(2);
                      }
                    }
                  } else if (currentStep === 2) {
                    // Step 2 validation: module configuration required
                    if (moduleValid) {
                      setCurrentStep(3);
                    }
                  } else if (currentStep === 3) {
                    // Step 3: always allow to Review
                    setCurrentStep(4);
                  }
                }}
                disabled={
                  (currentStep === 1 &&
                    ((selectedProvider === "aws" && !((usingExistingAccount && selectedAccount) ||
                      (!usingExistingAccount && formData.accessKey && formData.secretKey && formData.region))) ||
                    (selectedProvider !== "aws" && !formData.region))
                  ) ||
                  (currentStep === 2 && !moduleValid)
                }
                className={`flex items-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition ${
                  ((currentStep === 1 &&
                    ((selectedProvider === "aws" && !((usingExistingAccount && selectedAccount) ||
                      (!usingExistingAccount && formData.accessKey && formData.secretKey && formData.region))) ||
                    (selectedProvider !== "aws" && !formData.region))
                  ) ||
                  (currentStep === 2 && !moduleValid))
                    ? "opacity-50 cursor-not-allowed"
                    : ""
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
