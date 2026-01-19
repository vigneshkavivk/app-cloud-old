# #!/bin/bash
# # Initial setup commands for ArgoCD

# aws eks update-kubeconfig --name demo-cluster --region us-east-1
# kubectl create namespace argocd
# kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
# kubectl patch svc argocd-server -n argocd -p "{\"spec\": {\"type\": \"LoadBalancer\"}}"