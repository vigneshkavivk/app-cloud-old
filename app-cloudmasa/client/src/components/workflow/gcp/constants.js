export const modules = [
  { id: "compute", name: "Compute Engine",  price: { instance: 0.05 }, description: "VMs on Google...", requirements: ["VPC"] },
  { id: "gke", name: "GKE",  price: { cluster: 0.1 }, description: "Kubernetes on GCP...", requirements: ["Cluster"] },
  { id: "vpc", name: "VPC",  price: { network: 0.01 }, description: "Networking...", requirements: ["CIDR"] },
  { id: "storage", name: "Cloud Storage",  price: { storage: 0.02 }, description: "Object storage...", requirements: ["Bucket"] },
];
