// src/components/workflow/azure/constants.js
export const modules = [
  { id: "vm", name: "Virtual Machines",  price: { instance: 0.04 }, description: "Azure VMs...", requirements: ["VNet"] },
  { id: "aks", name: "AKS",  price: { nodes: 0.1 }, description: "Kubernetes on Azure...", requirements: ["Cluster"] },
  { id: "vnet", name: "Virtual Network",  price: { vnet: 0.01 }, description: "Azure VNet...", requirements: ["CIDR"] },
  { id: "blob", name: "Blob Storage",  price: { storage: 0.0184 }, description: "Object storage...", requirements: ["Account"] },
];
